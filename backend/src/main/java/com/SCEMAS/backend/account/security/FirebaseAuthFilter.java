package com.SCEMAS.backend.account.security;

/*
 * FirebaseAuthFilter.java
 *
 * Intercepts incoming HTTP requests to extract and verify Firebase ID tokens.
 * Loads the corresponding Account from the database and attaches a CustomUserPrincipal
 * to Spring Security’s context, so the user’s identity and roles are available
 * for authorization checks in controllers and endpoints.
 */

import java.io.IOException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.SCEMAS.backend.account.model.Account;
import com.SCEMAS.backend.account.service.AccountService;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;

@Component
public class FirebaseAuthFilter extends OncePerRequestFilter {

    @Autowired
    private AccountService accountService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);

            try {
                // Verify Firebase ID token
                FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(token);
                String uid = decodedToken.getUid();

                Account account = accountService.getAccountInternal(uid);
                
                if (account == null &&
                    "POST".equalsIgnoreCase(request.getMethod()) &&
                    request.getRequestURI().startsWith("/accounts")) {

                    // allow first-time signup
                    request.setAttribute("firebaseUid", uid);
                    // don’t set role yet
                    filterChain.doFilter(request, response);
                    return;
                }

                // Existing user: set attributes and authenticate
                request.setAttribute("firebaseUid", account.getFirebaseUid());
                request.setAttribute("role", account.getType());

                CustomUserPrincipal principal = new CustomUserPrincipal(account);

                UsernamePasswordAuthenticationToken auth =
                        new UsernamePasswordAuthenticationToken(
                                principal,
                                null,
                                principal.getAuthorities()
                        );

                SecurityContextHolder.getContext().setAuthentication(auth);

            } catch (Exception e) {
                e.printStackTrace();
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                return;
            }
        }

        filterChain.doFilter(request, response);
    }
}