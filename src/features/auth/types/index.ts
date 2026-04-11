import * as z from 'zod';

/**
    Define the schema of the register request.
*/
export const registerSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  username: z.string().min(1,'Username is required')
  .min(3,"Username must be at least 3 characters long")
  ,
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(32, "Password must be less than 32 characters")
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character (@, #, $, etc.)'),
  confirmPassword: z.string(),
  terms: z.boolean().refine((val) => val === true, {
      message: "You must agree to the Terms of Service",
    }),
    rememberMe: z.boolean().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;