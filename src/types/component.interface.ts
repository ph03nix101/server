export interface ReferenceComponent {
    id: number;
    component_type: 'CPU' | 'GPU';
    manufacturer: string;
    model_name: string;
    category: string;
    cores?: number;
    clock_speed_mhz?: number;
    socket?: string;
    chipset?: string;
    memory_size?: string;
    memory_type?: string;
}

export interface ComponentSearchParams {
    q: string;
    type: 'CPU' | 'GPU';
    category: 'Laptop' | 'Desktop';
}
