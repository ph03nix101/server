import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { ReferenceComponent } from '../types/component.interface';

@Injectable()
export class ComponentsService {
    constructor(@Inject('DATABASE_CONNECTION') private pool: Pool) { }

    async search(
        query: string,
        type: 'CPU' | 'GPU',
        category: 'Laptop' | 'Desktop'
    ): Promise<ReferenceComponent[]> {
        // Don't search on short queries
        if (!query || query.length < 2) {
            return [];
        }

        // Map frontend category to database category
        const dbCategory = category === 'Laptop' ? 'Mobile' : 'Desktop';

        const { rows } = await this.pool.query(
            `SELECT * FROM reference_components
       WHERE component_type = $1 
       AND category = $2
       AND (model_name ILIKE $3 OR manufacturer ILIKE $3)
       ORDER BY model_name
       LIMIT 15`,
            [type, dbCategory, `%${query}%`]
        );

        return rows;
    }

    async getById(id: number): Promise<ReferenceComponent | null> {
        const { rows } = await this.pool.query(
            'SELECT * FROM reference_components WHERE id = $1',
            [id]
        );
        return rows[0] || null;
    }
}
