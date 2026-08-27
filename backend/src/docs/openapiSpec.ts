export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'UWE (Unity Warriors Empire) Platform API',
    version: '2.0.0',
    description: 'Mission-critical REST API Gateway for UWE Command Center, LMS Video Vault, Recruitment CRM, and Student Portal.',
    contact: {
      name: 'UWE Command Council',
      email: 'support@uwe.lk',
    },
  },
  servers: [
    {
      url: '/api',
      description: 'API Gateway (Relative)',
    },
    {
      url: 'https://uwe-pearl.vercel.app/api',
      description: 'Production Cloud Vercel Serverless',
    },
    {
      url: 'http://localhost:5005/api',
      description: 'Local Development Server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT access token (e.g. Bearer eyJhbGciOi...)',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Invalid request' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Authentication successful' },
          data: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' },
              token: { type: 'string' },
              accessToken: { type: 'string' },
              refreshToken: { type: 'string' },
              role: { type: 'string', enum: ['SUPER_ADMIN', 'COMMANDER', 'COACH', 'RECRUITER'] },
            },
          },
        },
      },
      Course: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          slug: { type: 'string', example: 'bmb' },
          title: { type: 'string', example: 'BMB Mind Rewiring' },
          subtitle: { type: 'string' },
          badge: { type: 'string', example: 'MIND DIVISION' },
          price: { type: 'number', example: 15000 },
          currency: { type: 'string', example: 'RS.' },
          duration: { type: 'string', example: '5 Days Intensive' },
        },
      },
      LeadInput: {
        type: 'object',
        required: ['name', 'phone'],
        properties: {
          name: { type: 'string', example: 'Kamal Perera' },
          phone: { type: 'string', example: '+94 77 123 4567' },
          email: { type: 'string', format: 'email', example: 'kamal@example.com' },
          courseSlug: { type: 'string', example: 'bmb' },
          inquiryType: { type: 'string', enum: ['BMB', 'LEADERSHIP', 'IGNIT', 'CORPORATE', 'JOB_APPLICATION', 'GENERAL'] },
          message: { type: 'string', example: 'I want to enroll in the next batch.' },
        },
      },
      JobApplicationInput: {
        type: 'object',
        required: ['vacancyId', 'name', 'phone'],
        properties: {
          vacancyId: { type: 'string' },
          name: { type: 'string', example: 'Nimal Silva' },
          phone: { type: 'string', example: '+94 71 987 6543' },
          email: { type: 'string', format: 'email' },
          experience: { type: 'string', example: '2 years B2B Sales experience' },
        },
      },
      PaymentSlipInput: {
        type: 'object',
        required: ['studentName', 'studentPhone', 'courseSlug', 'slipUrl'],
        properties: {
          studentName: { type: 'string', example: 'Kasun Wickrama' },
          studentPhone: { type: 'string', example: '+94 76 555 1234' },
          studentEmail: { type: 'string', format: 'email' },
          courseSlug: { type: 'string', example: 'bmb' },
          slipUrl: { type: 'string', example: 'data:image/png;base64,...' },
          amount: { type: 'number', example: 15000 },
          bankReference: { type: 'string', example: 'BOC-TX-984210' },
        },
      },
      CouponValidationInput: {
        type: 'object',
        required: ['code'],
        properties: {
          code: { type: 'string', example: 'EMPIRE20' },
          courseSlug: { type: 'string', example: 'bmb' },
          originalPrice: { type: 'number', example: 15000 },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        summary: 'Server Health Telemetry',
        tags: ['System'],
        responses: {
          200: {
            description: 'Server is healthy and online',
          },
        },
      },
    },
    '/auth/admin-login': {
      post: {
        summary: 'Command HQ Administrator Login',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['username', 'password'],
                properties: {
                  username: { type: 'string', example: 'admin@uwe.lk' },
                  password: { type: 'string', example: 'admin123' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Access Granted with JWT Token pair',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
          },
          401: { description: 'Invalid Admin Credentials' },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Student Operative Login',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'student@uwe.lk' },
                  password: { type: 'string', example: 'student123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Authentication Successful' },
          401: { description: 'Invalid Credentials' },
        },
      },
    },
    '/auth/register': {
      post: {
        summary: 'Register New Student Operative',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'New Student' },
                  email: { type: 'string', example: 'newstudent@uwe.lk' },
                  password: { type: 'string', example: 'securePass123' },
                  phone: { type: 'string', example: '+94 77 000 0000' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Operative account created' },
          400: { description: 'Validation failed or email already registered' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        summary: 'Refresh Expired Access Token',
        tags: ['Authentication'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                  refreshToken: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'New token pair issued' },
          401: { description: 'Invalid or expired refresh token' },
        },
      },
    },
    '/courses': {
      get: {
        summary: 'Get All Courses & Active Batches',
        tags: ['Courses & LMS'],
        responses: {
          200: { description: 'List of courses with active cohorts' },
        },
      },
      post: {
        summary: 'Create Course (Admin only)',
        security: [{ BearerAuth: [] }],
        tags: ['Courses & LMS'],
        responses: {
          201: { description: 'Course created' },
          403: { description: 'Insufficient permissions' },
        },
      },
    },
    '/leads': {
      get: {
        summary: 'Get CRM WhatsApp Inquiries (Admin only)',
        security: [{ BearerAuth: [] }],
        tags: ['Leads & CRM'],
        responses: {
          200: { description: 'CRM Leads roster' },
        },
      },
      post: {
        summary: 'Submit New Lead Inquiry',
        tags: ['Leads & CRM'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LeadInput' } } },
        },
        responses: {
          201: { description: 'Lead submitted successfully' },
        },
      },
    },
    '/jobs': {
      get: {
        summary: 'List Active Career Vacancies',
        tags: ['Careers & Recruitment'],
        responses: {
          200: { description: 'List of open job positions' },
        },
      },
    },
    '/jobs/apply': {
      post: {
        summary: 'Submit Job Candidate Application',
        tags: ['Careers & Recruitment'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/JobApplicationInput' } } },
        },
        responses: {
          201: { description: 'Application submitted successfully' },
        },
      },
    },
    '/slips': {
      get: {
        summary: 'List Bank Payment Slips (Admin only)',
        security: [{ BearerAuth: [] }],
        tags: ['Finance & Payments'],
        responses: {
          200: { description: 'List of payment slips' },
        },
      },
      post: {
        summary: 'Upload Bank Payment Receipt',
        tags: ['Finance & Payments'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/PaymentSlipInput' } } },
        },
        responses: {
          201: { description: 'Slip submitted for review' },
        },
      },
    },
    '/coupons/validate': {
      post: {
        summary: 'Validate Promo Discount Code',
        tags: ['Coupons & Discounts'],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CouponValidationInput' } } },
        },
        responses: {
          200: { description: 'Validation results with discount calculation' },
        },
      },
    },
    '/reviews/{courseSlug}': {
      get: {
        summary: 'Get Approved Course Reviews',
        tags: ['Reviews & Testimonials'],
        parameters: [
          { name: 'courseSlug', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'List of student reviews' },
        },
      },
    },
    '/instructors': {
      get: {
        summary: 'Get Faculty Directory',
        tags: ['Faculty'],
        responses: {
          200: { description: 'List of active instructors' },
        },
      },
    },
  },
};
