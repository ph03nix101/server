import { Pool } from 'pg';
import { ReferenceComponent } from '../types/component.interface';
export declare class ComponentsService {
    private pool;
    constructor(pool: Pool);
    search(query: string, type: 'CPU' | 'GPU', category: 'Laptop' | 'Desktop'): Promise<ReferenceComponent[]>;
    getById(id: number): Promise<ReferenceComponent | null>;
}
