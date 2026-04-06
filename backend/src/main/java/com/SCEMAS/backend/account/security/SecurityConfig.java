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
import org.springframework.beans.factory.annotation.Autowired;

import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private FirebaseAuthFilter firebaseAuthFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {

        http.csrf(csrf -> csrf.disable())   // <--- disable CSRF using lambda
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/admin/**").hasRole("SYSTEM_ADMINISTRATOR")
                .requestMatchers("/operator/**").hasAnyRole("SYSTEM_ADMINISTRATOR", "CITY_OPERATOR")
                .anyRequest().authenticated()
            )
            .addFilterBefore(firebaseAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}