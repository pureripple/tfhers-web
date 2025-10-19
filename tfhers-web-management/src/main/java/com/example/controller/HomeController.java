package com.example.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HomeController {
    
    /**
     * 首页重定向到登录页面
     */
    @GetMapping("/")
    public String index() {
        return "redirect:/admin-login.html";
    }
    
    /**
     * 管理页面重定向到登录页面
     */
    @GetMapping("/admin")
    public String admin() {
        return "redirect:/admin-login.html";
    }
}




