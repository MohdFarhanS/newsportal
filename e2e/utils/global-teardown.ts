import { sweepLeftoverE2eData, disconnectTestDb } from "./db"

export default async function globalTeardown() {
  await sweepLeftoverE2eData()
  await disconnectTestDb()
}
