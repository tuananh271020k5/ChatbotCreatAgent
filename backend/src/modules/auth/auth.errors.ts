import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';

export class AuthenticationRequiredException extends UnauthorizedException {
  constructor(message = 'Yêu cầu đăng nhập để truy cập tài nguyên') {
    super(message);
  }
}

export class InvalidSessionException extends UnauthorizedException {
  constructor(message = 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn') {
    super(message);
  }
}

export class CsrfForbiddenException extends ForbiddenException {
  constructor(message = 'Yêu cầu bị từ chối do vi phạm bảo vệ CSRF') {
    super(message);
  }
}

export class OidcAuthenticationException extends HttpException {
  constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super(message, status);
  }
}

export class TenantAccessForbiddenException extends ForbiddenException {
  constructor(message = 'Người dùng không có quyền truy cập vào không gian làm việc (tenant) này') {
    super(message);
  }
}

export class TenantSuspendedException extends ForbiddenException {
  constructor(message = 'Không gian làm việc (tenant) đang bị tạm dừng hoặc đã lưu trữ') {
    super(message);
  }
}
