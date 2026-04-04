package com.SCEMAS.backend.account.repository;

import com.SCEMAS.backend.account.model.Account;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AccountRepository extends JpaRepository<Account, String> {
    Optional<Account> findByEmail(String email);
    Optional<Account> findByFirebaseUid(String firebaseUid);
}
