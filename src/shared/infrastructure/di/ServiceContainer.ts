
/**
 * Service container for dependency injection (Mock)
 * Supabase has been removed.
 */
export class ServiceContainer {
  private contractRepository: any = null;
  private userRepository: any = null;

  constructor(private readonly supabase: any) {}

  getContractRepository(): any {
    return this.contractRepository;
  }

  getUserRepository(): any {
    return this.userRepository;
  }

  setContractRepository(repository: any): void {
    this.contractRepository = repository;
  }

  setUserRepository(repository: any): void {
    this.userRepository = repository;
  }
}
