import { z } from 'zod';

export const emailSchema = z.string().email('Please enter a valid email address');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: emailSchema,
  password: passwordSchema,
});

export const vaultNameSchema = z.string().min(2, 'Vault name must be at least 2 characters').max(100, 'Vault name must be less than 100 characters');

export const createVaultSchema = z.object({
  name: vaultNameSchema,
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
});

export const personProfileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100, 'Full name must be less than 100 characters'),
  birthDate: z.string().optional().nullable(),
  deathDate: z.string().optional().nullable(),
  biography: z.string().max(2000, 'Biography must be less than 2000 characters').optional(),
});

export const relationshipSchema = z.object({
  personAId: z.string().min(1, 'Please select the first person'),
  personBId: z.string().min(1, 'Please select the second person'),
  type: z.enum(['PARENT_OF', 'ADOPTIVE_PARENT_OF', 'SPOUSE_OF', 'SIBLING_OF']),
}).refine((data) => data.personAId !== data.personBId, {
  message: 'Cannot create relationship with the same person',
  path: ['personBId'],
});

export const mediaMetadataSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  location: z.string().max(200, 'Location must be less than 200 characters').optional(),
  tags: z.array(z.string().min(1).max(50)).max(20, 'Maximum 20 tags allowed'),
});

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: z.enum(['ADMIN', 'CONTRIBUTOR', 'VIEWER']),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type CreateVaultFormData = z.infer<typeof createVaultSchema>;
export type PersonProfileFormData = z.infer<typeof personProfileSchema>;
export type RelationshipFormData = z.infer<typeof relationshipSchema>;
export type MediaMetadataFormData = z.infer<typeof mediaMetadataSchema>;
export type InviteMemberFormData = z.infer<typeof inviteMemberSchema>;
