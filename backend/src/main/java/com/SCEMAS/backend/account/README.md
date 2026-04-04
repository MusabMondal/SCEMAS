Security Layer Overview:

All incoming requests pass through the FirebaseAuthFilter, which verifies the Firebase ID token and loads the corresponding Account. The Account is wrapped in a CustomUserPrincipal, providing roles (ADMIN, OPERATOR, PUBLIC_USER) to Spring Security. SecurityConfig enforces role-based access to endpoints.