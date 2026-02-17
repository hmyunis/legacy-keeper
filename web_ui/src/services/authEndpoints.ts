export const AUTH_API = {
  register: 'users/register/',
  login: 'users/login/',
  googleLogin: 'users/google/login/',
  refreshToken: 'users/token/refresh/',
  me: 'users/me/',
  verifyEmail: 'users/verify/',
  resendVerification: 'users/resend-verification/',
  forgotPassword: 'users/forgot-password/',
  resetPassword: 'users/reset-password/',
};

export const AUTH_RELATED_PATHS = Object.values(AUTH_API);
