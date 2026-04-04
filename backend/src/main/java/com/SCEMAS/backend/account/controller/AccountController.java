package com.SCEMAS.backend.account.controller;


import org.springframework.web.bind.annotation.*;

import com.SCEMAS.backend.account.model.Account;
import com.SCEMAS.backend.account.service.AccountService;

@RestController
@RequestMapping("/accounts")
public class AccountController {
    
    private final AccountService accountService;

    public AccountController(AccountService accountService) {
        this.accountService = accountService;
    }

    @PostMapping
    public Account createAccount(@RequestBody Account request) {
        return accountService.createAccount(
                request.getName(),
                request.getEmail(),
                request.getType(),
                request.getFirebaseUid()
        );
    }

    @GetMapping("/{id}")
    public Account getAccount(@PathVariable String id) {
        return accountService.getAccount(id);
    }

    @PutMapping("/{id}")
    public Account updateAccount(@PathVariable String id, @RequestBody Account request) {
        return accountService.updateAccount(
                id,
                request.getName(),
                request.getEmail(),
                request.getType()
        );
    }

    @DeleteMapping("/{id}")
    public void deleteAccount(@PathVariable String id) {
        accountService.deleteAccount(id);
    }

}
