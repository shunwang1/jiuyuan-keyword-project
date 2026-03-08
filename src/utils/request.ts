// src/utils/request.ts
// 统一请求入口：基于 cookie 会话 + RPC 统一返回
// 直接复用 src/api/http.ts 的 request，避免出现 axios/token 两套体系

export { request } from '../api/http'
export type { RequestOptions, RequestError, RpcEnvelope, ResponseType } from '../api/http'
