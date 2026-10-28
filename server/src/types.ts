export interface D1Result<T = Record<string, unknown>> {
  results?: T[];
  success: boolean;
  meta?: { changes?: number };
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(column?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}

export interface Env {
  DB: D1Database;
  APPLE_ROOT_CERTIFICATES?: string;
  APPLE_BUNDLE_ID?: string;
  /** Apple's identity-token signing keys as JSON; when set, they are used instead of downloading Apple's. */
  APPLE_JWKS_JSON?: string;
  PRODUCT_CATALOG_JSON?: string;
  /** Sign in with Apple, server side: the Team ID, the key's ID and the key itself (the .p8 file's text). Without them the token is not revoked. */
  APPLE_TEAM_ID?: string;
  APPLE_SIGN_IN_KEY_ID?: string;
  APPLE_SIGN_IN_PRIVATE_KEY?: string;
  /** Comma-separated purchase environments to accept; default "Production". Add "Sandbox" only while testing (TestFlight, App Review). */
  PURCHASE_ENVIRONMENTS?: string;
}

/** The two things a player buys and spends. */
export type Currency = "tickets" | "matatabi";

export interface ProductDefinition {
  /** お迎え券 credited by a one-time purchase. */
  tickets?: number;
  /** またたび credited by a one-time purchase. */
  matatabi?: number;
  /** A subscription: its name (またたびパス). A product is either a one-time purchase or a plan, never both. */
  plan?: string;
  /** お迎え券 a plan hands over for each billing period; they carry over like bought ones. */
  monthlyTickets?: number;
  /** Price in yen, used for the monthly spending cap of younger players. */
  priceYen?: number;
}

export interface VerifiedTransaction {
  transactionId: string;
  originalTransactionId?: string;
  productId: string;
  bundleId: string;
  purchaseDate: number;
  expiresDate?: number;
  revocationDate?: number;
  appAccountToken?: string;
  /** "Production" or "Sandbox" (TestFlight and App Review buy in the Sandbox). */
  environment?: string;
}

export type AgeGroup = "under16" | "16to19" | "adult";

export type AppleLinkResult = "linked" | "already_linked" | "apple_in_use" | "account_has_other_apple";

export interface CloudSave {
  data: string;
  version: number;
  updatedAt: string;
}

export interface Wallet {
  tickets: number;
  matatabi: number;
}

/** What an hourly clean-up did: a growing `expiredLeft` (or the limit reached) means it is behind. */
export type PurgeOutcome = {
  rateLimitsRemoved: number;
  /** Counters that have not expired yet. */
  rateLimitsRemaining: number;
  /** Counters that were already past their time but are still there after this run. */
  expiredLeft: number;
  /** How long ago (ms) the oldest of those expired; 0 when none. */
  oldestExpiredAgeMs: number;
  /** The run used all its slices: there may be more to remove. */
  reachedLimit: boolean;
};

export interface Store {
  /** Remove the account and everything that belongs to it (wallet, purchases, saves, Apple link). */
  deleteUser(userId: string): Promise<void>;
  registerUser(userId: string, secretHash: string): Promise<void>;
  credentialHash(userId: string): Promise<string | null>;
  userExists(userId: string): Promise<boolean>;
  /** Replace the account's secret, so a sign-in on a new device takes over. */
  rotateSecret(userId: string, secretHash: string): Promise<void>;
  cloudSave(userId: string): Promise<CloudSave | null>;
  /** Store the save if `baseVersion` is the stored version (0 when there is none); returns the new version, or null on a conflict. */
  putCloudSave(userId: string, data: string, baseVersion: number): Promise<number | null>;
  linkApple(userId: string, appleSub: string): Promise<AppleLinkResult>;
  userByApple(appleSub: string): Promise<string | null>;
  appleLinked(userId: string): Promise<boolean>;
  /** The Apple ID (its stable `sub`) this account is linked to, or null. */
  appleSubOf(userId: string): Promise<string | null>;
  /** Apple's refresh token for this account (kept to revoke it on deletion), or null. */
  appleRefreshToken(userId: string): Promise<string | null>;
  setAppleRefreshToken(userId: string, token: string): Promise<void>;
  ageGroup(userId: string): Promise<AgeGroup | null>;
  setAgeGroup(userId: string, group: AgeGroup): Promise<void>;
  /** Product ids of this user's purchases (not revoked) granted in [from, to). */
  purchasedProducts(userId: string, from: string, to: string): Promise<string[]>;
  /** Count one call in this window (`window` is the number of the `windowMs`-long period); the counter expires two periods after it started. */
  hitRateLimit(key: string, window: number, windowMs: number): Promise<number>;
  wallet(userId: string): Promise<Wallet>;
  /** Spend `amount` of a currency once for this `ref`. False when the balance is short or the `ref` was already spent. */
  consume(userId: string, currency: Currency, amount: number, ref: string): Promise<boolean>;
  /** Record a purchase and credit a one-time product. False when this transaction was already recorded (or already refunded). Safe to repeat. */
  recordPurchase(userId: string, transaction: VerifiedTransaction, product: ProductDefinition): Promise<boolean>;
  /** One billing period of a plan: remember it and credit that period's お迎え券 once. Safe to repeat. */
  recordPlanPeriod(userId: string, plan: string, periodStart: string, periodEnd: string, tickets: number, transactionId: string): Promise<void>;
  /** The plan whose billing period covers `at`, or null. */
  activePlan(userId: string, at: string): Promise<string | null>;
  /** Apple refunded this purchase: take back what is unspent of it. Safe to repeat. */
  revokePurchase(transactionId: string, product?: ProductDefinition, plan?: { name: string; periodStart: string }): Promise<void>;
  /** Whether a refund or revocation of this transaction is on record (it may have arrived before the purchase did). */
  isRevoked(transactionId: string): Promise<boolean>;
  /** How many refunds since `since` came after some of what they bought was already spent. */
  refundShortfalls(userId: string, since: string): Promise<number>;
  /** Removes counters that can no longer matter, so an address is not kept past its window. */
  purgeExpired(now: Date): Promise<PurgeOutcome>;
}

export interface ExecutionContext {
  waitUntil?(promise: Promise<unknown>): void;
  passThroughOnException?(): void;
}
