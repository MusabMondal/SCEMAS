package com.SCEMAS.backend.account.controller;


import org.springframework.web.bind.annotation.*;

import com.SCEMAS.backend.account.model.Account;
import com.SCEMAS.backend.account.model.AccountType;
import com.SCEMAS.backend.account.service.AccountService;

import jakarta.servlet.http.HttpServletRequest;

import java.util.List;

@RestController
@RequestMapping("/accounts")
public class AccountController {
    
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
    public Account getAccount(@PathVariable String firebaseUid,
                              HttpServletRequest req) throws Exception {

        String requesterUid = (String) req.getAttribute("firebaseUid");
        AccountType role = (AccountType) req.getAttribute("role");

        return accountService.getAccount(requesterUid, role, firebaseUid);
    }

    // Update account detailes
   @PutMapping("/{firebaseUid}")
    public Account updateAccount(@PathVariable String firebaseUid,
                                 @RequestBody Account request,
                                 HttpServletRequest req) throws Exception {

        String requesterUid = (String) req.getAttribute("firebaseUid");
        AccountType role = (AccountType) req.getAttribute("role");

        return accountService.updateAccount(
                requesterUid,
                role,
                firebaseUid,
                request.getName(),
                request.getEmail(),
                request.getType().name()
        );
    }

    // Delete account
    @DeleteMapping("/{firebaseUid}")
    public void deleteAccount(@PathVariable String firebaseUid,
                              HttpServletRequest req) throws Exception {

        String requesterUid = (String) req.getAttribute("firebaseUid");
        AccountType role = (AccountType) req.getAttribute("role");

        accountService.deleteAccount(requesterUid, role, firebaseUid);
    }

    @GetMapping
    public List<Account> listaccounts(HttpServletRequest req) throws Exception {

        AccountType role = (AccountType) req.getAttribute("role");

        return accountService.getAllAccounts(role);
    }

}
