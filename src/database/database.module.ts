import { Module, Global } from '@nestjs/common';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';

const databaseProvider = {
    provide: 'DATABASE_CONNECTION',
    inject: [ConfigService],
    useFactory: async (configService: ConfigService) => {
        return new Pool({
            user: configService.get<string>('DB_USER'),
            password: configService.get<string>('DB_PASSWORD'),
            host: configService.get<string>('DB_HOST'),
            port: parseInt(configService.get<string>('DB_PORT') || '5432'),
            database: configService.get<string>('DB_NAME'),
        });
    },
};

@Global()
@Module({
    providers: [databaseProvider],
    exports: [databaseProvider],
})
export class DatabaseModule { }
