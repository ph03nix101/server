export interface Category {
    id: number;
    name: string;
    slug: string;
    icon?: string;
}
export interface CategoryAttribute {
    id: number;
    category_id: number;
    key_name: string;
    label: string;
    input_type: 'text' | 'select' | 'number' | 'checkbox' | 'multiselect' | 'reference_search';
    options?: string[];
    data_source?: string;
    filter_context?: {
        component_type?: string;
        category?: string;
    };
    unit?: string;
    is_required: boolean;
    display_order: number;
}
