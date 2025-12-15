import { ComponentsService } from './components.service';
export declare class ComponentsController {
    private readonly componentsService;
    constructor(componentsService: ComponentsService);
    search(query: string, type: 'CPU' | 'GPU', category: 'Laptop' | 'Desktop'): Promise<import("../types/component.interface").ReferenceComponent[]>;
    getById(id: string): Promise<import("../types/component.interface").ReferenceComponent | null>;
}
