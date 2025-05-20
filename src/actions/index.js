import { defineAction } from 'astro:actions';
import { z } from 'astro:schema';

export const server = {
  sendEmail: defineAction({
    accept: 'form',
    input: z.object({
      fname: z
            .any()
            .transform((val) => (typeof val === 'string' ? val : ''))
            .refine((val) => val.trim().length > 0, {
              message: 'this field is required',
            }),
      lname: z
            .any()
            .transform((val) => (typeof val === 'string' ? val : ''))
            .refine((val) => val.trim().length > 0, {
              message: 'this field is required',
            }),
      email: z
            .any()
            .transform((val) => (typeof val === 'string' ? val : ''))
            .refine((val) => val.trim().length > 0, {
              message: 'this field is required',
            })
            .refine((val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
              message: 'please enter a valid email address',
            }),
      queryt: z
            .any()
            .transform((val) => (typeof val === 'string' ? val : ''))
            .refine((val) => val.trim().length > 0, {
              message: 'please select a query type',
            }),
      message: z
            .any()
            .transform((val) => (typeof val === 'string' ? val : ''))
            .refine((val) => val.trim().length > 0, {
              message: 'this field is required',
            }),
      consent:z
              .any()
              .transform((val) => val === 'on')
              .refine((val) => val === true, {
                message: 'to submit this form, please consent to being contacted',
              }),
    }),
    handler: async ({fname}) => {
      // console.log(fname);
      return {
        status: true,
        message: 'Form submitted successfully'
      }
      // console.log(fname, lname, queryt,consent);
    },
  })
};