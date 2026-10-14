import { z } from 'zod';

export const skillFormSchema = z.object({
  skillId: z.string().min(1, 'employees.profile.qualifications.requiredSkill'),
  level: z.number().int().min(1).max(5),
});

export const certificateFormSchema = z.object({
  name: z.string().trim().min(1, 'employees.profile.qualifications.requiredName').max(150, 'employees.profile.qualifications.tooLong'),
  issuer: z.string().trim().max(150, 'employees.profile.qualifications.tooLong'),
  issuedAt: z.string(),
  expiresAt: z.string(),
  attachmentId: z.string(),
}).refine(value => !value.issuedAt || !value.expiresAt || value.expiresAt >= value.issuedAt, {
  path: ['expiresAt'], message: 'employees.profile.qualifications.invalidDates',
});

export type SkillFormValues = z.infer<typeof skillFormSchema>;
export type CertificateFormValues = z.infer<typeof certificateFormSchema>;
