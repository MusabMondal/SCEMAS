package com.SCEMAS.backend.account.security;

/*
 * CustomUserPrincipal.java
 *
 * Wraps an Account entity as a Spring Security UserDetails object.
 * Provides the user’s roles (ADMIN, OPERATOR, PUBLC_USER) to Spring Security
 * for role-based access control and allows controllers to access the Account info.
 */

import org.springframework.security.core.userdetails.UserDetails;

import com.SCEMAS.backend.account.model.Account;
import java.util.Collection;
import java.util.List;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

public class CustomUserPrincipal implements UserDetails {

    private final Account account;

    public CustomUserPrincipal(Account account) {
        this.account = account;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(
            new SimpleGrantedAuthority("ROLE_" + account.getType().name())
        );
    }

    @Override 
    public String getUsername() { 
        return account.getFirebaseUid(); }

    @Override 
    public String getPassword() { 
        return null; }

    @Override 
    public boolean isAccountNonExpired() {
        return true; }

    @Override 
    public boolean isAccountNonLocked() { 
        return true; }

    @Override 
    public boolean isCredentialsNonExpired() { 
        return true; }

    @Override 
    public boolean isEnabled() { 
        return true; }

    public Account getAccount() {
        return account;
    }
}
