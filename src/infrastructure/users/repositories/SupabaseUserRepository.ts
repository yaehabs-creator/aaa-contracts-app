import type { SupabaseClient } from '@supabase/supabase-js';
import { IUserRepository } from '../../../domain/users/repositories/IUserRepository';
import { User } from '../../../domain/users/entities/User';
import { AppErrors } from '../../../shared/application/errors/AppError';
import { ErrorHandler } from '../../../shared/application/errors/ErrorHandler';
import { logger } from '../../../shared/infrastructure/observability/Logger';
import { metrics } from '../../../shared/infrastructure/observability/Metrics';

/**
 * Supabase implementation of IUserRepository
 */
export class SupabaseUserRepository implements IUserRepository {
  constructor(private readonly supabase: SupabaseClient) {
    if (!supabase) {
      throw new Error('Supabase client is required');
    }
  }

  async findById(uid: string): Promise<User | null> {
    const startTime = Date.now();
    logger.startOperation('findUserById', { userId: uid });

    try {
      const { data: userData, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('uid', uid)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw AppErrors.databaseError(`Failed to fetch user: ${error.message}`, error);
      }

      if (!userData) {
        return null;
      }

      const user = new User(
        userData.uid,
        userData.email,
        userData.display_name,
        userData.role,
        userData.created_at,
        userData.last_login || undefined,
        userData.created_by || undefined
      );

      const duration = Date.now() - startTime;
      metrics.timing('user.findById', duration);
      logger.endOperation('findUserById', duration, { userId: uid });

      return user;
    } catch (error) {
      const appError = ErrorHandler.handle(error, {
        operation: 'findUserById',
        userId: uid,
      });
      logger.operationError('findUserById', appError.cause || appError, {
        userId: uid,
      });
      throw appError;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    const startTime = Date.now();
    logger.startOperation('findUserByEmail', { email });

    try {
      const { data: userData, error } = await this.supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw AppErrors.databaseError(`Failed to fetch user: ${error.message}`, error);
      }

      if (!userData) {
        return null;
      }

      const user = new User(
        userData.uid,
        userData.email,
        userData.display_name,
        userData.role,
        userData.created_at,
        userData.last_login || undefined,
        userData.created_by || undefined
      );

      const duration = Date.now() - startTime;
      metrics.timing('user.findByEmail', duration);
      logger.endOperation('findUserByEmail', duration, { email });

      return user;
    } catch (error) {
      const appError = ErrorHandler.handle(error, {
        operation: 'findUserByEmail',
        email,
      });
      logger.operationError('findUserByEmail', appError.cause || appError, { email });
      throw appError;
    }
  }

  async findAll(): Promise<User[]> {
    const startTime = Date.now();
    logger.startOperation('findAllUsers');

    try {
      const { data: usersData, error } = await this.supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw AppErrors.databaseError(`Failed to fetch users: ${error.message}`, error);
      }

      const users = (usersData || []).map(
        (userData) =>
          new User(
            userData.uid,
            userData.email,
            userData.display_name,
            userData.role,
            userData.created_at,
            userData.last_login || undefined,
            userData.created_by || undefined
          )
      );

      const duration = Date.now() - startTime;
      metrics.timing('user.findAll', duration);
      metrics.gauge('user.count', users.length);
      logger.endOperation('findAllUsers', duration, { count: users.length });

      return users;
    } catch (error) {
      const appError = ErrorHandler.handle(error, {
        operation: 'findAllUsers',
      });
      logger.operationError('findAllUsers', appError.cause || appError);
      throw appError;
    }
  }

  async create(user: User): Promise<void> {
    const startTime = Date.now();
    logger.startOperation('createUser', { userId: user.uid });

    try {
      const { error } = await this.supabase.from('users').insert({
        uid: user.uid,
        email: user.email,
        display_name: user.displayName,
        role: user.role,
        created_at: user.createdAt,
        created_by: user.createdBy || null,
      });

      if (error) {
        throw AppErrors.databaseError(`Failed to create user: ${error.message}`, error);
      }

      const duration = Date.now() - startTime;
      metrics.timing('user.create', duration);
      logger.endOperation('createUser', duration, { userId: user.uid });
    } catch (error) {
      const appError = ErrorHandler.handle(error, {
        operation: 'createUser',
        userId: user.uid,
      });
      logger.operationError('createUser', appError.cause || appError, {
        userId: user.uid,
      });
      throw appError;
    }
  }

  async update(user: User): Promise<void> {
    const startTime = Date.now();
    logger.startOperation('updateUser', { userId: user.uid });

    try {
      const { error } = await this.supabase
        .from('users')
        .update({
          email: user.email,
          display_name: user.displayName,
          role: user.role,
          last_login: user.lastLogin || null,
        })
        .eq('uid', user.uid);

      if (error) {
        throw AppErrors.databaseError(`Failed to update user: ${error.message}`, error);
      }

      const duration = Date.now() - startTime;
      metrics.timing('user.update', duration);
      logger.endOperation('updateUser', duration, { userId: user.uid });
    } catch (error) {
      const appError = ErrorHandler.handle(error, {
        operation: 'updateUser',
        userId: user.uid,
      });
      logger.operationError('updateUser', appError.cause || appError, {
        userId: user.uid,
      });
      throw appError;
    }
  }

  async delete(uid: string): Promise<void> {
    const startTime = Date.now();
    logger.startOperation('deleteUser', { userId: uid });

    try {
      const { error } = await this.supabase.from('users').delete().eq('uid', uid);

      if (error) {
        throw AppErrors.databaseError(`Failed to delete user: ${error.message}`, error);
      }

      const duration = Date.now() - startTime;
      metrics.timing('user.delete', duration);
      logger.endOperation('deleteUser', duration, { userId: uid });
    } catch (error) {
      const appError = ErrorHandler.handle(error, {
        operation: 'deleteUser',
        userId: uid,
      });
      logger.operationError('deleteUser', appError.cause || appError, {
        userId: uid,
      });
      throw appError;
    }
  }

  async exists(uid: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('uid')
        .eq('uid', uid)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw AppErrors.databaseError(`Failed to check user existence: ${error.message}`, error);
      }

      return !!data;
    } catch (error) {
      const appError = ErrorHandler.handle(error, {
        operation: 'userExists',
        userId: uid,
      });
      throw appError;
    }
  }
}
