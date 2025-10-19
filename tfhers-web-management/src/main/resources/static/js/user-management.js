// 用户管理页面JavaScript

// 全局变量
let currentPage = 1;
let pageSize = 10;
let totalPages = 1;
let currentFilters = {
    keyword: '',
    role: '',
    status: ''
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
});

// 初始化页面
function initializePage() {
    console.log('开始初始化用户管理页面...');
    
    // 检查登录状态
    if (!checkLoginStatus()) {
        window.location.href = 'admin-login.html';
        return;
    }
    
    // 初始化用户菜单
    initializeUserMenu();
    
    // 加载用户列表
    loadUsers();
    
    // 初始化表单事件
    initializeForms();
    
    console.log('用户管理页面初始化完成');
}

// 检查登录状态
function checkLoginStatus() {
    const token = localStorage.getItem('admin_token');
    console.log('检查登录状态，token:', token);
    const isValid = token && token !== 'null';
    console.log('登录状态有效:', isValid);
    return isValid;
}

// 初始化用户菜单
function initializeUserMenu() {
    const userMenu = document.getElementById('userMenu');
    const userDropdown = document.getElementById('userDropdown');
    
    if (userMenu && userDropdown) {
        userMenu.addEventListener('mouseenter', function() {
            userDropdown.classList.add('show');
        });
        
        userMenu.addEventListener('mouseleave', function() {
            userDropdown.classList.remove('show');
        });
    }
}

// 初始化表单事件
function initializeForms() {
    // 创建用户表单
    const createUserForm = document.getElementById('createUserForm');
    if (createUserForm) {
        createUserForm.addEventListener('submit', handleCreateUser);
    }
    
    // 编辑用户表单
    const editUserForm = document.getElementById('editUserForm');
    if (editUserForm) {
        editUserForm.addEventListener('submit', handleEditUser);
    }
    
    // 重置密码表单
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', handleResetPassword);
    }
    
    // 搜索输入框回车事件
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchUsers();
            }
        });
    }
}

// 加载用户列表
function loadUsers() {
    showLoading();
    
    const params = new URLSearchParams({
        page: currentPage,
        size: pageSize,
        ...currentFilters
    });
    
    fetch(`/api/user-management/list?${params}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        console.log('用户列表数据:', data);
        if (data.code === 200) {
            renderUsers(data.data);
        } else {
            showToast('获取用户列表失败: ' + data.msg, 'error');
        }
    })
    .catch(error => {
        console.error('获取用户列表失败:', error);
        showToast('获取用户列表失败', 'error');
    })
    .finally(() => {
        hideLoading();
    });
}

// 渲染用户列表
function renderUsers(data) {
    const users = data.users || [];
    const total = data.total || 0;
    totalPages = data.totalPages || 1;
    
    const usersTable = document.getElementById('usersTable');
    const usersTableBody = document.getElementById('usersTableBody');
    const emptyState = document.getElementById('emptyState');
    const pagination = document.getElementById('pagination');
    
    if (users.length === 0) {
        usersTable.style.display = 'none';
        emptyState.style.display = 'block';
        pagination.style.display = 'none';
        return;
    }
    
    usersTable.style.display = 'table';
    emptyState.style.display = 'none';
    pagination.style.display = 'flex';
    
    // 渲染用户表格
    usersTableBody.innerHTML = users.map(user => `
        <tr>
            <td>
                <div class="user-info">
                    <img src="${user.avatarUrl || 'images/default-avatar.png'}" alt="头像" class="user-avatar">
                    <div class="user-details">
                        <h4>${user.nickname}</h4>
                        <p>@${user.username}</p>
                        ${user.email ? `<p>${user.email}</p>` : ''}
                        ${user.phone ? `<p>${user.phone}</p>` : ''}
                    </div>
                </div>
            </td>
            <td>
                <span class="role-badge role-${user.role.toLowerCase()}">
                    ${user.role === 'ADMIN' ? '管理员' : '普通用户'}
                </span>
            </td>
            <td>
                <span class="status-badge status-${user.status === 1 ? 'active' : 'inactive'}">
                    ${user.status === 1 ? '正常' : '禁用'}
                </span>
            </td>
            <td>
                ${user.lastLoginTime ? formatDateTime(user.lastLoginTime) : '从未登录'}
            </td>
            <td>
                ${formatDateTime(user.createdAt)}
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-secondary" onclick="editUser(${user.id})">编辑</button>
                    <button class="btn btn-sm btn-warning" onclick="resetUserPassword(${user.id})">重置密码</button>
                    <button class="btn btn-sm ${user.status === 1 ? 'btn-danger' : 'btn-success'}" 
                            onclick="toggleUserStatus(${user.id}, ${user.status})">
                        ${user.status === 1 ? '禁用' : '启用'}
                    </button>
                    <button class="btn btn-sm ${user.role === 'ADMIN' ? 'btn-secondary' : 'btn-warning'}" 
                            onclick="toggleUserRole(${user.id}, '${user.role}')">
                        ${user.role === 'ADMIN' ? '设为普通用户' : '设为管理员'}
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id})">删除</button>
                </div>
            </td>
        </tr>
    `).join('');
    
    // 渲染分页
    renderPagination();
}

// 渲染分页
function renderPagination() {
    const pagination = document.getElementById('pagination');
    const paginationInfo = document.createElement('div');
    paginationInfo.className = 'pagination-info';
    paginationInfo.textContent = `第 ${currentPage} 页，共 ${totalPages} 页`;
    
    pagination.innerHTML = '';
    
    // 上一页按钮
    const prevButton = document.createElement('button');
    prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevButton.disabled = currentPage <= 1;
    prevButton.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            loadUsers();
        }
    };
    pagination.appendChild(prevButton);
    
    // 页码按钮
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.className = i === currentPage ? 'active' : '';
        pageButton.onclick = () => {
            currentPage = i;
            loadUsers();
        };
        pagination.appendChild(pageButton);
    }
    
    // 下一页按钮
    const nextButton = document.createElement('button');
    nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextButton.disabled = currentPage >= totalPages;
    nextButton.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            loadUsers();
        }
    };
    pagination.appendChild(nextButton);
    
    pagination.appendChild(paginationInfo);
}

// 搜索用户
function searchUsers() {
    const keyword = document.getElementById('searchInput').value.trim();
    const role = document.getElementById('roleFilter').value;
    const status = document.getElementById('statusFilter').value;
    
    currentFilters = {
        keyword: keyword,
        role: role,
        status: status ? parseInt(status) : ''
    };
    
    currentPage = 1;
    loadUsers();
}

// 重置筛选条件
function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('roleFilter').value = '';
    document.getElementById('statusFilter').value = '';
    
    currentFilters = {
        keyword: '',
        role: '',
        status: ''
    };
    
    currentPage = 1;
    loadUsers();
}

// 显示创建用户模态框
function showCreateUserModal() {
    document.getElementById('createUserModal').classList.add('show');
    document.getElementById('createUserForm').reset();
}

// 隐藏创建用户模态框
function hideCreateUserModal() {
    document.getElementById('createUserModal').classList.remove('show');
}

// 处理创建用户
function handleCreateUser(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const userData = {
        username: formData.get('username'),
        nickname: formData.get('nickname'),
        password: formData.get('password'),
        email: formData.get('email') || null,
        phone: formData.get('phone') || null,
        role: formData.get('role')
    };
    
    fetch('/api/user-management/create', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.code === 200) {
            showToast('用户创建成功', 'success');
            hideCreateUserModal();
            loadUsers();
        } else {
            showToast('用户创建失败: ' + data.msg, 'error');
        }
    })
    .catch(error => {
        console.error('创建用户失败:', error);
        showToast('用户创建失败', 'error');
    });
}

// 编辑用户
function editUser(userId) {
    fetch(`/api/user-management/${userId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.code === 200) {
            const user = data.data;
            document.getElementById('editUserId').value = user.id;
            document.getElementById('editNickname').value = user.nickname;
            document.getElementById('editEmail').value = user.email || '';
            document.getElementById('editPhone').value = user.phone || '';
            document.getElementById('editUserModal').classList.add('show');
        } else {
            showToast('获取用户信息失败: ' + data.msg, 'error');
        }
    })
    .catch(error => {
        console.error('获取用户信息失败:', error);
        showToast('获取用户信息失败', 'error');
    });
}

// 隐藏编辑用户模态框
function hideEditUserModal() {
    document.getElementById('editUserModal').classList.remove('show');
}

// 处理编辑用户
function handleEditUser(e) {
    e.preventDefault();
    
    const userId = document.getElementById('editUserId').value;
    const formData = new FormData(e.target);
    const userData = {
        nickname: formData.get('nickname'),
        email: formData.get('email') || null,
        phone: formData.get('phone') || null
    };
    
    fetch(`/api/user-management/${userId}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.code === 200) {
            showToast('用户信息更新成功', 'success');
            hideEditUserModal();
            loadUsers();
        } else {
            showToast('用户信息更新失败: ' + data.msg, 'error');
        }
    })
    .catch(error => {
        console.error('更新用户信息失败:', error);
        showToast('用户信息更新失败', 'error');
    });
}

// 重置用户密码
function resetUserPassword(userId) {
    document.getElementById('resetPasswordUserId').value = userId;
    document.getElementById('resetPasswordModal').classList.add('show');
    document.getElementById('resetPasswordForm').reset();
}

// 隐藏重置密码模态框
function hideResetPasswordModal() {
    document.getElementById('resetPasswordModal').classList.remove('show');
}

// 处理重置密码
function handleResetPassword(e) {
    e.preventDefault();
    
    const userId = document.getElementById('resetPasswordUserId').value;
    const newPassword = document.getElementById('newPassword').value;
    
    fetch(`/api/user-management/${userId}/password`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newPassword: newPassword })
    })
    .then(response => response.json())
    .then(data => {
        if (data.code === 200) {
            showToast('密码重置成功', 'success');
            hideResetPasswordModal();
        } else {
            showToast('密码重置失败: ' + data.msg, 'error');
        }
    })
    .catch(error => {
        console.error('重置密码失败:', error);
        showToast('密码重置失败', 'error');
    });
}

// 切换用户状态
function toggleUserStatus(userId, currentStatus) {
    const newStatus = currentStatus === 1 ? 0 : 1;
    const action = newStatus === 1 ? '启用' : '禁用';
    
    if (confirm(`确定要${action}该用户吗？`)) {
        fetch(`/api/user-management/${userId}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        })
        .then(response => response.json())
        .then(data => {
            if (data.code === 200) {
                showToast(`用户${action}成功`, 'success');
                loadUsers();
            } else {
                showToast(`用户${action}失败: ` + data.msg, 'error');
            }
        })
        .catch(error => {
            console.error(`${action}用户失败:`, error);
            showToast(`用户${action}失败`, 'error');
        });
    }
}

// 切换用户角色
function toggleUserRole(userId, currentRole) {
    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    const action = newRole === 'ADMIN' ? '设为管理员' : '设为普通用户';
    
    if (confirm(`确定要将该用户${action}吗？`)) {
        fetch(`/api/user-management/${userId}/role`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ role: newRole })
        })
        .then(response => response.json())
        .then(data => {
            if (data.code === 200) {
                showToast(`用户角色更新成功`, 'success');
                loadUsers();
            } else {
                showToast(`用户角色更新失败: ` + data.msg, 'error');
            }
        })
        .catch(error => {
            console.error('更新用户角色失败:', error);
            showToast('用户角色更新失败', 'error');
        });
    }
}

// 删除用户
function deleteUser(userId) {
    if (confirm('确定要删除该用户吗？此操作不可恢复！')) {
        fetch(`/api/user-management/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.code === 200) {
                showToast('用户删除成功', 'success');
                loadUsers();
            } else {
                showToast('用户删除失败: ' + data.msg, 'error');
            }
        })
        .catch(error => {
            console.error('删除用户失败:', error);
            showToast('用户删除失败', 'error');
        });
    }
}

// 显示加载状态
function showLoading() {
    document.getElementById('loading').classList.add('show');
    document.getElementById('usersTable').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('pagination').style.display = 'none';
}

// 隐藏加载状态
function hideLoading() {
    document.getElementById('loading').classList.remove('show');
}

// 格式化日期时间
function formatDateTime(dateTimeString) {
    if (!dateTimeString) return '';
    const date = new Date(dateTimeString);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 显示消息提示
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <div class="toast-icon"></div>
            <div class="toast-message">${message}</div>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // 显示动画
    setTimeout(() => toast.classList.add('show'), 100);
    
    // 自动隐藏
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
}

// 退出登录
function logout() {
    if (confirm('确定要退出登录吗？')) {
        localStorage.removeItem('admin_token');
        window.location.href = 'admin-login.html';
    }
}
