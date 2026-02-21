import { AuditEvent } from './types';

export interface Preset {
    name: string;
    description: string;
    event: AuditEvent;
}

export const presets: Preset[] = [
    {
        name: 'Update Credit Limit',
        description: 'UPDATE_CREDIT_LIMIT — Change customer credit limit',
        event: {
            actor: {
                user_id: 'EMP-001',
                role: 'ADMIN',
                ip_address: '192.168.1.100',
            },
            event: {
                action: 'UPDATE',
                module: 'credit-management',
                outcome: 'SUCCESS',
            },
            target: {
                resource_type: 'credit_limit',
                resource_id: 'CL-2026-0001',
            },
            changes: {
                field: 'credit_limit',
                old_value: 50000,
                new_value: 100000,
            },
        },
    },
    {
        name: 'Create User',
        description: 'CREATE_USER — Register new system user',
        event: {
            actor: {
                user_id: 'ADMIN-001',
                role: 'SUPER_ADMIN',
                ip_address: '10.0.0.1',
            },
            event: {
                action: 'CREATE',
                module: 'user-management',
                outcome: 'SUCCESS',
            },
            target: {
                resource_type: 'user_account',
                resource_id: 'USR-2026-0042',
            },
            payload: {
                field: 'user_account',
                old_value: null,
                new_value: {
                    username: 'john.doe',
                    email: 'john@example.com',
                    role: 'USER',
                },
            },
        },
    },
    {
        name: 'Delete Account',
        description: 'DELETE_ACCOUNT — Permanently remove user account',
        event: {
            actor: {
                user_id: 'ADMIN-002',
                role: 'SUPER_ADMIN',
                ip_address: '10.0.0.2',
            },
            event: {
                action: 'DELETE',
                module: 'user-management',
                outcome: 'SUCCESS',
            },
            target: {
                resource_type: 'user_account',
                resource_id: 'USR-2025-0099',
            },
            metadata: {
                correlation_id: 'REQ-DELETE-2026-001',
                service_name: 'admin-portal',
            },
        },
    },
    {
        name: 'Access Record',
        description: 'ACCESS — View sensitive customer data',
        event: {
            actor: {
                user_id: 'CO-001',
                role: 'COMPLIANCE_OFFICER',
                ip_address: '172.16.0.50',
            },
            event: {
                action: 'ACCESS',
                module: 'customer-data',
                outcome: 'SUCCESS',
            },
            target: {
                resource_type: 'customer_pii',
                resource_id: 'CUST-2026-1234',
            },
        },
    },
    {
        name: 'User Login',
        description: 'AUTHENTICATION — User login event',
        event: {
            actor: {
                user_id: 'USR-2026-0042',
                role: 'USER',
                ip_address: '203.0.113.42',
                user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
            },
            event: {
                action: 'AUTHENTICATION',
                module: 'auth',
                outcome: 'SUCCESS',
            },
            target: {
                resource_type: 'session',
                resource_id: 'SES-2026-abcdef',
            },
        },
    },
];
