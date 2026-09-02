// current API exposes account-recovery commands only for pre-provisioned
// TEACHER/ADMIN accounts. The student Web client therefore provides an honest
// support path instead of simulating a successful recovery request.

import { tx } from "../i18n.js";
import { icon } from "../icons.js";

export function renderRecoveryRequest() {
  return `<div class="screen recovery-screen">
    <div class="recovery-topbar">
      <button class="icon-btn pressable text-primary" data-action="recovery.back" aria-label="${tx("返回", "Back")}">${icon("arrow-back", 24)}</button>
      <span class="title-medium text-on-surface">${tx("邮箱登录帮助", "Email sign-in help")}</span>
    </div>
    <div class="screen-scroll" data-scroll-key="recovery">
      <div class="recovery-form col" style="gap:24px">
        <div class="col" style="gap:10px">
          <div class="headline-medium text-on-surface">${tx("无法使用已验证邮箱？", "Can’t use your verified email?")}</div>
          <div class="body-large text-muted">${tx("学生端没有手机号、短信验证码或自助账户恢复入口。请联系学校体育教学部或账户管理员核验身份并处理邮箱。", "The student client has no phone, SMS-code, or self-service account-recovery flow. Contact the sports office or account administrator to verify your identity and resolve the email account.")}</div>
        </div>
        <div class="swiss-panel"><div class="col" style="gap:14px">
          <div class="title-medium text-on-surface">${tx("联系时请准备", "Information to prepare")}</div>
          <div class="body-medium text-muted">${tx("学号、姓名、学校邮箱，以及页面显示的错误码和 requestId。请勿发送密码、验证码、Token 或完整环境配置。", "Provide your student ID, name, university email, and any error code/requestId shown on screen. Do not send passwords, verification codes, tokens, or full environment configuration.")}</div>
        </div></div>
        <button class="primary-btn pressable" data-action="recovery.back" style="min-height:52px">${tx("返回邮箱登录", "Back to email sign-in")}</button>
      </div>
    </div>
  </div>`;
}

export const recoveryActions = {
  "recovery.back": (app) => {
    app.ui.recovery = null;
    app.state.showRecoveryRequest = false;
    app.navDirection = "back";
    app.render();
  },
};
