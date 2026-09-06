(function(root) {
  'use strict';
  function friendlyError(error) {
    if (/fetch|network|load failed/i.test(error?.message || '')) return '无法连接认证服务，请检查网络和 Supabase 项目地址。连接恢复前无法发送邮件或重置密码。';
    if (error?.status === 429) return '请求过于频繁，请稍后再试。';
    if (/expired|invalid.*token|session.*missing|otp_expired/i.test(`${error?.code || ''} ${error?.message || ''}`)) return '重置链接已失效或过期，请重新申请邮件，并打开最新链接。';
    return error?.message || '操作失败，请稍后重试。';
  }
  function createRecovery(doc,sb) {
    const $ = id => doc.getElementById(id);
    let recoverySession = false, busy = false, nextSendAt = 0;
    const clearPassword = () => { $('new-password').value = ''; $('confirm-password').value = ''; };
    function onAuth(event,session) {
      if(event === 'PASSWORD_RECOVERY' && session) {
        recoverySession = true;
        $('recovery-request').hidden = true; $('recovery-update').hidden = false;
        $('recovery-status').textContent = '邮箱验证成功，请设置新密码。';
        // Tokens are consumed by the SDK before this event; keep them out of browser history.
        root.history.replaceState(null,'',root.location.pathname);
      } else if(event === 'SIGNED_OUT') {
        recoverySession = false; clearPassword();
        $('recovery-update').hidden = true; $('recovery-request').hidden = false;
      }
    }
    sb?.auth.onAuthStateChange(onAuth);
    async function request(event) {
      event.preventDefault(); if(busy) return;
      $('recovery-error').textContent = ''; $('recovery-status').textContent = '';
      if(!$('recovery-email').checkValidity()) { $('recovery-email').reportValidity(); return; }
      if(Date.now() < nextSendAt) { $('recovery-error').textContent = '邮件已请求，请等待一分钟后再试。'; return; }
      busy = true; $('send-recovery').disabled = true;
      try {
        if(!sb) throw new Error('认证服务未加载，请刷新重试。');
        const redirectTo = new URL('./reset-password.html',root.location.href).href;
        const {error} = await sb.auth.resetPasswordForEmail($('recovery-email').value.trim(),{redirectTo});
        if(error) throw error;
        nextSendAt = Date.now()+60000;
        $('recovery-status').textContent = '如果该邮箱已注册且可以接收邮件，你将收到重置链接。请检查收件箱和垃圾邮件。';
      } catch(error) { $('recovery-error').textContent = friendlyError(error); }
      finally { busy = false; $('send-recovery').disabled = false; }
    }
    async function update(event) {
      event.preventDefault(); if(busy) return;
      $('recovery-error').textContent = '';
      const password = $('new-password').value;
      if(!recoverySession) { $('recovery-error').textContent = '请先打开邮件中的有效重置链接。'; return; }
      if(password.length < 12) { $('recovery-error').textContent = '新密码至少需要 12 个字符。'; return; }
      if(password !== $('confirm-password').value) { $('recovery-error').textContent = '两次输入的密码不一致。'; return; }
      busy = true; $('update-password').disabled = true;
      try {
        const {data,error:identityError} = await sb.auth.getUser();
        if(identityError || !data?.user) throw identityError || new Error('重置链接已失效或过期，请重新申请邮件。');
        const {error} = await sb.auth.updateUser({password});
        if(error) throw error;
        recoverySession = false; clearPassword();
        $('recovery-update').hidden = true;
        $('recovery-status').textContent = '密码已重置，请返回登录并使用新密码。';
        // This recovery client uses memory-only storage and never overwrites the admin session.
        const {error:signOutError} = await sb.auth.signOut({scope:'local'});
        if(signOutError) $('recovery-error').textContent = '密码已更新，但恢复会话退出失败。请关闭此页面后重新登录。';
      } catch(error) { clearPassword(); $('recovery-error').textContent = friendlyError(error); }
      finally { busy = false; $('update-password').disabled = false; }
    }
    async function init() {
      const params = new URLSearchParams(root.location.hash.slice(1));
      const query = new URLSearchParams(root.location.search);
      const callbackError = params.has('error') || query.has('error');
      try {
        if(!sb) throw new Error('认证服务未加载，请检查网络并刷新。');
        const {error} = await sb.auth.getSession();
        if(error) throw error;
        if(callbackError || !recoverySession && (params.has('access_token') || params.get('type') === 'recovery')) {
          throw new Error('重置链接已失效或过期，请重新申请邮件。');
        }
      } catch(error) { $('recovery-error').textContent = friendlyError(error); }
      finally { root.history.replaceState(null,'',root.location.pathname); }
    }
    $('recovery-request').addEventListener('submit',request);
    $('recovery-update').addEventListener('submit',update);
    return {request,update,init};
  }
  if(typeof module !== 'undefined') module.exports = {createRecovery,friendlyError};
  else {
    let sb = null;
    try {
      sb = root.supabase?.createClient(root.APP_CONFIG.supabaseUrl,root.APP_CONFIG.supabasePublishableKey,{
        auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:true,flowType:'implicit',storageKey:'history-map-password-recovery'}
      });
    } catch (_) { /* init renders a visible configuration/network error */ }
    createRecovery(root.document,sb).init();
  }
})(typeof window !== 'undefined' ? window : globalThis);
