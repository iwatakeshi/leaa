import bcryptjs from 'bcryptjs';
import { Injectable } from '@nestjs/common';
import { Repository, FindOneOptions } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { User, Role } from '@leaa/common/entrys';
import { UsersArgs, UsersObject, UserArgs, CreateUserInput, UpdateUserInput } from '@leaa/common/dtos/user';
import { BaseService } from '@leaa/api/modules/base/base.service';
import { formatUtil, loggerUtil } from '@leaa/api/utils';

@Injectable()
export class UserService extends BaseService<User, UsersArgs, UsersObject, UserArgs, CreateUserInput, UpdateUserInput> {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
  ) {
    super(userRepository);
  }

  async users(args: UsersArgs): Promise<UsersObject> {
    const nextArgs = formatUtil.formatArgs(args);
    nextArgs.relations = ['roles'];

    return this.findAll(nextArgs);
  }

  async user(id: number, args?: FindOneOptions<User>): Promise<User | undefined> {
    let nextArgs: FindOneOptions<User> = {};

    if (args) {
      nextArgs = args;
      nextArgs.relations = ['roles'];
    }

    return this.findOne(id, nextArgs);
  }

  async craeteUser(args: CreateUserInput): Promise<User | undefined> {
    const nextArgs = args;

    if (args.password) {
      const salt = bcryptjs.genSaltSync();
      nextArgs.password = bcryptjs.hashSync(args.password, salt);
    }

    return this.userRepository.save({ ...nextArgs });
  }

  async updateUser(id: number, args?: UpdateUserInput): Promise<User | undefined> {
    const relationArgs: { roles?: Role[] } = {};

    if (args && args.roleIds) {
      const roleObjects = await this.roleRepository.findByIds(args.roleIds);

      if (roleObjects && roleObjects.length && roleObjects.length > 0) {
        relationArgs.roles = roleObjects;
      } else {
        const message = `roles error`;

        loggerUtil.warn(message, this.constructor.name);
        throw new Error(message);
      }
    }

    return this.update(id, args, relationArgs);
  }

  async deleteUser(id: number): Promise<User | undefined> {
    return this.delete(id);
  }
}
