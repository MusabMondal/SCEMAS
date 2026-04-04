package com.SCEMAS.backend.account.controller;


import org.springframework.web.bind.annotation.*;

import com.SCEMAS.backend.account.model.Account;
import com.SCEMAS.backend.account.service.AccountService;

import org.springframework.beans.factory.annotation.Autowired;
import java.util.List;

@RestController
@RequestMapping("/accounts")
public class AccountController {
    
    @Autowired
    private final AccountService accountService;

    public AccountController(AccountService accountService) {
        this.accountService = accountService;
    }

    // Creating a new account
    @PostMapping
    public Account createAccount(@RequestBody Account request) throws Exception {
        return accountService.createAccount(
                request.getName(),
                request.getEmail(),
                request.getType().name(),
                request.getFirebaseUid()
        );
    }

    // Get account by FirebaseUID
    @GetMapping("/{firebaseUid}")
    public Account getAccount(@PathVariable String firebaseUid) throws Exception {
        return accountService.getAccount(firebaseUid);
    }

    // Update account detailes
    @PutMapping("/{firebaseUid}")
    public Account updateAccount(@PathVariable String firebaseUid, @RequestBody Account request) throws Exception {
        return accountService.updateAccount(
                firebaseUid,
                request.getName(),
                request.getEmail(),
                request.getType().name()
        );
    }

    // Delete account
    @DeleteMapping("/{firebaseUid}")
    public void deleteAccount(@PathVariable String firebaseUid) throws Exception {
        accountService.deleteAccount(firebaseUid);
    }

    @GetMapping
    public List<Account> listaccounts() throws Exception {
        return accountService.getAllAccounts();
    }

}
