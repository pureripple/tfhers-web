// 个人设置页面JavaScript

// 全局变量
let currentUser = null;
let originalBasicData = {};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    try {
        initializePage();
    } catch (error) {
        console.error('页面初始化失败:', error);
        document.body.style.display = 'block';
        setProfileLoadingHint(false);
    }
});

// 初始化页面
function initializePage() {
    if (!checkLoginStatus()) {
        window.location.href = 'admin-login.html';
        return;
    }

    initializeTabs();
    initializeUserMenu();
    initializeAvatarUpload();
    initializeForms();
    loadUserInfo();
}

// 检查登录状态
function checkLoginStatus() {
    const token = localStorage.getItem('admin_token');
    return token && token !== 'null';
}

function setProfileLoadingHint(visible) {
    const el = document.getElementById('profileLoadingHint');
    if (el) el.hidden = !visible;
}

// 初始化标签页
function initializeTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // 移除所有活动状态
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // 添加活动状态
            this.classList.add('active');
            document.getElementById(targetTab + 'Tab').classList.add('active');
        });
    });
}

// 初始化用户菜单
function initializeUserMenu() {
    const userInfo = document.getElementById('userInfo');
    const userDropdown = document.getElementById('userDropdown');
    
    userInfo.addEventListener('click', function(e) {
        e.stopPropagation();
        userDropdown.classList.toggle('show');
    });
    
    // 点击其他地方关闭菜单
    document.addEventListener('click', function() {
        userDropdown.classList.remove('show');
    });
}

// 加载用户信息
async function loadUserInfo() {
    setProfileLoadingHint(true);
    try {
        const response = await fetch('/api/profile/info', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('admin_token'),
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.code === 200) {
            currentUser = result.data;
            updateUserInfo();
            updateBasicForm();
        } else {
            showToast('加载用户信息失败：' + result.msg, 'error');
        }
    } catch (error) {
        console.error('加载用户信息失败：', error);
        showToast('加载用户信息失败：' + error.message, 'error');
    } finally {
        setProfileLoadingHint(false);
    }
}

// 更新用户信息显示
function updateUserInfo() {
    if (!currentUser) return;
    
    // 更新顶部用户信息
    const userName = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');
    const currentAvatar = document.getElementById('currentAvatar');
    
    if (userName) userName.textContent = currentUser.realName || currentUser.username;
    if (userAvatar) {
        userAvatar.src = currentUser.avatarUrl || 'images/CSel3_LargePortTianhuo.png';
    }
    if (currentAvatar) {
        currentAvatar.src = currentUser.avatarUrl || 'images/CSel3_LargePortTianhuo.png';
    }
}

// 更新基本信息表单
function updateBasicForm() {
    if (!currentUser) return;
    
    const form = document.getElementById('basicInfoForm');
    const fields = ['username', 'realName', 'email', 'phone'];
    
    fields.forEach(field => {
        const input = form.querySelector(`[name="${field}"]`);
        if (input && currentUser[field]) {
            input.value = currentUser[field];
        }
    });
    
    // 保存原始数据
    originalBasicData = { ...currentUser };
}

// 初始化头像上传
function initializeAvatarUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const avatarFile = document.getElementById('avatarFile');
    
    // 点击上传区域
    uploadArea.addEventListener('click', function() {
        avatarFile.click();
    });
    
    // 文件选择
    avatarFile.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            uploadAvatar(file);
        }
    });
    
    // 拖拽上传
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            uploadAvatar(files[0]);
        }
    });
}

// 上传头像
async function uploadAvatar(file) {
    // 验证文件
    if (!file.type.startsWith('image/')) {
        showToast('请选择图片文件', 'error');
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        showToast('文件大小不能超过5MB', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    const progressContainer = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    try {
        progressContainer.style.display = 'block';
        
        const response = await fetch('/api/profile/avatar/upload', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('admin_token')
            },
            body: formData
        });
        
        const result = await response.json();
        
        if (result.code === 200) {
            // 更新头像显示
            currentUser.avatarUrl = result.data.avatarUrl;
            updateUserInfo();
            
            showToast('头像上传成功', 'success');
        } else {
            showToast('头像上传失败：' + result.msg, 'error');
        }
    } catch (error) {
        console.error('头像上传失败：', error);
        showToast('头像上传失败', 'error');
    } finally {
        progressContainer.style.display = 'none';
        progressFill.style.width = '0%';
        progressText.textContent = '0%';
    }
}

// 初始化表单
function initializeForms() {
    // 基本信息表单
    const basicForm = document.getElementById('basicInfoForm');
    basicForm.addEventListener('submit', handleBasicFormSubmit);
    
    // 修改密码表单
    const passwordForm = document.getElementById('changePasswordForm');
    passwordForm.addEventListener('submit', handlePasswordFormSubmit);
}

// 处理基本信息表单提交
async function handleBasicFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        realName: formData.get('realName'),
        email: formData.get('email'),
        phone: formData.get('phone')
    };
    
    try {
        const response = await fetch('/api/profile/update', {
            method: 'PUT',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('admin_token'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.code === 200) {
            showToast('个人信息更新成功', 'success');
            // 重新加载用户信息
            await loadUserInfo();
        } else {
            showToast('个人信息更新失败：' + result.msg, 'error');
        }
    } catch (error) {
        console.error('更新个人信息失败：', error);
        showToast('个人信息更新失败', 'error');
    }
}

// 处理修改密码表单提交
async function handlePasswordFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        oldPassword: formData.get('oldPassword'),
        newPassword: formData.get('newPassword'),
        confirmPassword: formData.get('confirmPassword')
    };
    
    // 验证密码
    if (data.newPassword !== data.confirmPassword) {
        showToast('新密码和确认密码不一致', 'error');
        return;
    }
    
    if (data.newPassword.length < 6) {
        showToast('新密码长度不能少于6位', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/profile/password/change', {
            method: 'PUT',
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('admin_token'),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.code === 200) {
            showToast('密码修改成功', 'success');
            // 清空表单
            e.target.reset();
        } else {
            showToast('密码修改失败：' + result.msg, 'error');
        }
    } catch (error) {
        console.error('修改密码失败：', error);
        showToast('修改密码失败', 'error');
    }
}

// 重置基本信息表单
function resetBasicForm() {
    if (!originalBasicData) return;
    
    const form = document.getElementById('basicInfoForm');
    const fields = ['realName', 'email', 'phone'];
    
    fields.forEach(field => {
        const input = form.querySelector(`[name="${field}"]`);
        if (input) {
            input.value = originalBasicData[field] || '';
        }
    });
}

// 重置密码表单
function resetPasswordForm() {
    const form = document.getElementById('changePasswordForm');
    form.reset();
}

// 显示消息提示
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = toast.querySelector('.toast-message');
    const toastIcon = toast.querySelector('.toast-icon');
    
    toastMessage.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    // 3秒后自动隐藏
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// 退出登录
function logout() {
    if (confirm('确定要退出登录吗？')) {
        localStorage.removeItem('admin_token');
        window.location.href = 'admin-login.html';
    }
}
