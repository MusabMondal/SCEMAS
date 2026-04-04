package com.SCEMAS.backend.account.service;


import com.SCEMAS.backend.account.model.Account;
import com.SCEMAS.backend.account.model.AccountType;
import com.SCEMAS.backend.account.repository.AccountRepository;

import org.springframework.stereotype.Service;


@Service
public class AccountService {
    
    private final AccountRepository accountRepository;

    public AccountService(AccountRepository accountRepository) {
        this.accountRepository = accountRepository;
    }

    public Account createAccount(String name, String email, AccountType type, String firebaseUid) {
        Account account = new Account();
        account.setName(name);
        account.setEmail(email);
        account.setType(type);
        account.setFirebaseUid(firebaseUid);

        return accountRepository.save(account);
    }

    public Account getAccount(String firebaseUid) {
        return accountRepository.findById(firebaseUid)
                .orElseThrow(() -> new RuntimeException("Account not found"));
    }

    public Account updateAccount(String firebaseUid, String name, String email, AccountType type) {
        Account acc = getAccount(firebaseUid);

        acc.setName(name);
        acc.setEmail(email);
        acc.setType(type);

        return accountRepository.save(acc);
    }

    public void deleteAccount(String firebaseUid) {
        accountRepository.deleteById(firebaseUid);
    }

}
