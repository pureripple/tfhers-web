package com.example.pojo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@NoArgsConstructor
public class results {
    private int code;
    private String msg;
    private Object data;
    
    // 手动添加构造器
    public results(int code, String msg, Object data) {
        this.code = code;
        this.msg = msg;
        this.data = data;
    }
    
    // Getter和Setter方法
    public int getCode() {
        return code;
    }

    public void setCode(int code) {
        this.code = code;
    }

    public String getMsg() {
        return msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }

    public Object getData() {
        return data;
    }

    public void setData(Object data) {
        this.data = data;
    }
    
    // 成功响应
    public static results success(Object data) {
        return new results(200, "操作成功", data);
    }
    
    public static results success(String msg, Object data) {
        return new results(200, msg, data);
    }
    
    // 失败响应
    public static results error(String msg) {
        return new results(500, msg, null);
    }
    
    public static results error(int code, String msg) {
        return new results(code, msg, null);
    }
}
