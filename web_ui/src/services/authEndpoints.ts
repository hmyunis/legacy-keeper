export const AUTH_API = {
  register: 'users/register/',
  login: 'users/login/',
  googleLogin: 'users/google/login/',
  refreshToken: 'users/token/refresh/',
  me: 'users/me/',
  verifyEmail: 'users/verify/',
  resendVerification: 'users/resend-verification/',
};

export const AUTH_RELATED_PATHS = Object.values(AUTH_API);
