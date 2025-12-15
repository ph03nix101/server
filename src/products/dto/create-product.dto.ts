import { IsString, IsNumber, IsObject, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateProductDto {
    @IsUUID()
    seller_id: string;
    // NOTE: In Phase 4 (Auth), this field will be removed from DTO
    // and extracted from JWT token in controller for security

    @IsNumber()
    category_id: number;

    @IsString()
    title: string;

    @IsNumber()
    @Min(0)
    price: number;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    condition: string;

    @IsObject()
    specs: Record<string, any>;

    @IsNumber()
    @IsOptional()
    cpu_ref_id?: number;

    @IsNumber()
    @IsOptional()
    gpu_ref_id?: number;
}
