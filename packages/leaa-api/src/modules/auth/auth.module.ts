import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User, Role, Permission } from '@leaa/common/entrys';

import { UserService } from '@leaa/api/modules/user/user.service';
import { UserProperty } from '@leaa/api/modules/user/user.property';
import { RoleService } from '@leaa/api/modules/role/role.service';
import { UserResolver } from '@leaa/api/modules/user/user.resolver';
import { AuthTokenModule } from '@leaa/api/modules/auth-token/auth-token.module';
import { PermissionService } from '@leaa/api/modules/permission/permission.service';
import { JwtStrategy } from '@leaa/api/strategies';

import { AuthResolver } from '@leaa/api/modules/auth/auth.resolver';
import { AuthService } from '@leaa/api/modules/auth/auth.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, Permission]), AuthTokenModule],
  providers: [
    AuthResolver,
    AuthService,
    UserResolver,
    UserService,
    RoleService,
    PermissionService,
    JwtStrategy,
    UserProperty,
  ],
  exports: [AuthService],
})
export class AuthModule {}
