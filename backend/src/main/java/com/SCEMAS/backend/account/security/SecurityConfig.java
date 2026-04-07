package com.SCEMAS.backend.account.security;

/*
 * SecurityConfig.java
 *
 * Configures Spring Security for the application.
 * Specifies which endpoints require which roles and adds the FirebaseAuthFilter
 * to the security filter chain to enforce authentication and authorization.
 */

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;

import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import org.springframework.http.HttpMethod;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private FirebaseAuthFilter firebaseAuthFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {

        http
            .cors(cors -> {})
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                // CORS preflight should always be allowed
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // Allow anyone to POST /accounts (signup)
                .requestMatchers(HttpMethod.POST, "/accounts/signup").permitAll()
                .requestMatchers(HttpMethod.GET, "/").permitAll()

                // Admin-only endpoints
                .requestMatchers("/admin/**").hasAnyAuthority("SYSTEM_ADMINISTRATOR")

                // Operator endpoints
                .requestMatchers("/operator/**").hasAnyAuthority("SYSTEM_ADMINISTRATOR", "CITY_OPERATOR")

                // Public endpoints
                .requestMatchers(HttpMethod.GET, "/accounts/**").hasAnyAuthority("SYSTEM_ADMINISTRATOR", "CITY_OPERATOR", "PUBLIC_USER")
                .requestMatchers("/public/**").hasAnyAuthority("SYSTEM_ADMINISTRATOR", "CITY_OPERATOR", "PUBLIC_USER")
                .requestMatchers("/api/**").hasAnyAuthority("SYSTEM_ADMINISTRATOR", "CITY_OPERATOR", "PUBLIC_USER")

                // All other endpoints require authentication
                .anyRequest().authenticated()
            )
            .addFilterBefore(firebaseAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:3000"));
        config.setAllowedMethods(List.of("*"));
        config.setAllowedHeaders(List.of("*"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
