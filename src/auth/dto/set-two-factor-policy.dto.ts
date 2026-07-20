import { IsBoolean, IsString } from 'class-validator';

/**
 * Not in the spec's FR-13 endpoint table — the table has no route for
 * setting `TwoFactorAuth.enforcedByPolicy`, which the business logic and
 * acceptance criteria both require a CHAIN_OWNER be able to do. Added and
 * flagged per the implementation plan.
 */
export class SetTwoFactorPolicyDto {
  @IsString()
  chainId!: string;

  @IsBoolean()
  enforcedByPolicy!: boolean;
}
