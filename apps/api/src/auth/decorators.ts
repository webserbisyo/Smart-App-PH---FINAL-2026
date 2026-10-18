import { SetMetadata, type CustomDecorator } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = (): CustomDecorator<string> => SetMetadata(IS_PUBLIC_KEY, true);

export const CAN_PERMISSION_KEY = 'canPermission';
export const Can = (permission: string): CustomDecorator<string> =>
  SetMetadata(CAN_PERMISSION_KEY, permission);
