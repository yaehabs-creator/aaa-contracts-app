import neo4j, { Driver, Session } from 'neo4j-driver'

/**
 * Service to manage Neo4j database connections and queries.
 * Based on Neo4j Aura (managed cloud) or local Neo4j.
 */
class Neo4jService {
    private driver: Driver | null = null

    /**
     * Initializes the Neo4j driver using environment variables.
     */
    private getDriver(): Driver {
        if (this.driver) return this.driver

        const uri = import.meta.env.VITE_NEO4J_URI || process.env.VITE_NEO4J_URI
        const user = import.meta.env.VITE_NEO4J_USERNAME || process.env.VITE_NEO4J_USERNAME
        const password = import.meta.env.VITE_NEO4J_PASSWORD || process.env.VITE_NEO4J_PASSWORD

        if (!uri || !user || !password) {
            console.warn('Neo4j credentials missing in environment variables.')
        }

        this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password))
        return this.driver
    }

    /**
     * Executes a write transaction with the given Cypher query and parameters.
     */
    async write(query: string, params: Record<string, any> = {}): Promise<any> {
        const driver = this.getDriver()
        const session: Session = driver.session()
        try {
            const result = await session.executeWrite((tx) => tx.run(query, params))
            return result
        } finally {
            await session.close()
        }
    }

    /**
     * Executes a read transaction with the given Cypher query and parameters.
     */
    async read(query: string, params: Record<string, any> = {}): Promise<any> {
        const driver = this.getDriver()
        const session: Session = driver.session()
        try {
            const result = await session.executeRead((tx) => tx.run(query, params))
            return result
        } finally {
            await session.close()
        }
    }

    /**
     * Closes the driver connection.
     */
    async close() {
        if (this.driver) {
            await this.driver.close()
            this.driver = null
        }
    }
}

export const neo4jService = new Neo4jService()
export default neo4jService
