import { test as setup } from "@playwright/test";

import { mkdir } from "node:fs/promises";

import { dirname } from "node:path";



import { ACCOUNTS } from "../fixtures/accounts";

import { loginAndSaveStorageState } from "../helpers/auth-storage";



const setupProducts = process.env.E2E_SETUP_PRODUCTS?.split(",").map((p) => p.trim()) ?? null;

const accountsToAuth = setupProducts

  ? ACCOUNTS.filter((a) => setupProducts.includes(a.product))

  : ACCOUNTS;



// One test = serial logins; avoids parallel captcha races on remote VMs.

setup("authenticate all roles", async ({ playwright }) => {
  setup.setTimeout(120_000);
  for (const acct of accountsToAuth) {

    const statePath = `auth/${acct.storageKey}.json`;

    await mkdir(dirname(statePath), { recursive: true });

    await loginAndSaveStorageState(playwright, acct, statePath);

  }

});

