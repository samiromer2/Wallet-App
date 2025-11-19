import 'react-native-get-random-values';
import { Buffer } from 'buffer';
import * as bip39 from 'bip39';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from '@bitcoinerlab/secp256k1';
import { BIP32Factory } from 'bip32';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Helper function to convert Buffer to Uint8Array (for @bitcoinerlab/secp256k1)
function toUint8Array(buf: Buffer | Uint8Array): Uint8Array {
  if (buf instanceof Uint8Array) return buf;
  return new Uint8Array(buf);
}

// Helper function to convert Uint8Array to Buffer
function toBuffer(arr: Uint8Array): Buffer {
  const buffer = Buffer.allocUnsafe(arr.length);
  for (let i = 0; i < arr.length; i++) {
    buffer[i] = arr[i];
  }
  return buffer;
}

// Create adapter to convert between Buffer (expected by bip32/bitcoinjs-lib) and Uint8Array (used by @bitcoinerlab/secp256k1)
const eccAdapter = {
  isPoint(p: Buffer): boolean {
    return ecc.isPoint(toUint8Array(p));
  },
  isPrivate(d: Buffer): boolean {
    return ecc.isPrivate(toUint8Array(d));
  },
  pointFromScalar(d: Buffer, compressed?: boolean): Buffer | null {
    const result = ecc.pointFromScalar(toUint8Array(d), compressed);
    return result ? toBuffer(result) : null;
  },
  pointAddScalar(p: Buffer, tweak: Buffer, compressed?: boolean): Buffer | null {
    const result = ecc.pointAddScalar(toUint8Array(p), toUint8Array(tweak), compressed);
    return result ? toBuffer(result) : null;
  },
  privateAdd(d: Buffer, tweak: Buffer): Buffer | null {
    const result = ecc.privateAdd(toUint8Array(d), toUint8Array(tweak));
    return result ? toBuffer(result) : null;
  },
  sign(hash: Buffer, d: Buffer, e?: Buffer): Buffer {
    const result = ecc.sign(toUint8Array(hash), toUint8Array(d), e ? toUint8Array(e) : undefined);
    return toBuffer(result);
  },
  verify(hash: Buffer, Q: Buffer, signature: Buffer, strict?: boolean): boolean {
    return ecc.verify(toUint8Array(hash), toUint8Array(Q), toUint8Array(signature), strict);
  },
  isXOnlyPoint(p: Buffer): boolean {
    return ecc.isXOnlyPoint(toUint8Array(p));
  },
  xOnlyPointAddTweak(p: Buffer, tweak: Buffer): { xOnlyPubkey: Buffer; parity: number } | null {
    const result = ecc.xOnlyPointAddTweak(toUint8Array(p), toUint8Array(tweak));
    if (!result) return null;
    return {
      xOnlyPubkey: toBuffer(result.xOnlyPubkey),
      parity: result.parity,
    };
  },
};

// Initialize BIP32 with ECC library
const bip32 = BIP32Factory(eccAdapter);

// Initialize bitcoinjs-lib with the ECC library
bitcoin.initEccLib(eccAdapter);

// Bitcoin network (mainnet or testnet)
const network = bitcoin.networks.testnet; // Change to bitcoin.networks.bitcoin for mainnet

export interface Wallet {
  mnemonic: string;
  privateKey: string;
  publicKey: string;
  address: string;
  wif: string; // Wallet Import Format
}

const WALLET_STORAGE_KEY = '@bitcoin_wallet';

/**
 * Generate a new Bitcoin wallet with mnemonic phrase
 */
export async function generateWallet(): Promise<Wallet> {
  // Generate mnemonic (12 words)
  const mnemonic = bip39.generateMnemonic();
  
  // Convert mnemonic to seed
  const seed = await bip39.mnemonicToSeed(mnemonic);
  
  // Create root from seed
  const root = bip32.fromSeed(seed, network);
  
  // Derive account (m/44'/0'/0'/0/0 for Bitcoin)
  const path = "m/44'/0'/0'/0/0";
  const account = root.derivePath(path);
  
  // Get key pair
  const privateKey = account.privateKey!;
  const publicKey = account.publicKey;
  
  // Create key pair for address generation
  const keyPair = bitcoin.ECPair.fromPrivateKey(privateKey, { network });
  
  // Generate P2PKH address (legacy)
  const { address } = bitcoin.payments.p2pkh({
    pubkey: publicKey,
    network: network,
  });
  
  // Get WIF (Wallet Import Format)
  const wif = keyPair.toWIF();
  
  const wallet: Wallet = {
    mnemonic,
    privateKey: privateKey.toString('hex'),
    publicKey: publicKey.toString('hex'),
    address: address!,
    wif,
  };
  
  // Save wallet to storage
  await saveWallet(wallet);
  
  return wallet;
}

/**
 * Import wallet from mnemonic phrase
 */
export async function importWalletFromMnemonic(mnemonic: string): Promise<Wallet> {
  if (!bip39.validateMnemonic(mnemonic)) {
    throw new Error('Invalid mnemonic phrase');
  }
  
  // Convert mnemonic to seed
  const seed = await bip39.mnemonicToSeed(mnemonic);
  
  // Create root from seed
  const root = bip32.fromSeed(seed, network);
  
  // Derive account
  const path = "m/44'/0'/0'/0/0";
  const account = root.derivePath(path);
  
  // Get key pair
  const privateKey = account.privateKey!;
  const publicKey = account.publicKey;
  
  // Create key pair for address generation
  const keyPair = bitcoin.ECPair.fromPrivateKey(privateKey, { network });
  
  // Generate address
  const { address } = bitcoin.payments.p2pkh({
    pubkey: publicKey,
    network: network,
  });
  
  // Get WIF
  const wif = keyPair.toWIF();
  
  const wallet: Wallet = {
    mnemonic,
    privateKey: privateKey.toString('hex'),
    publicKey: publicKey.toString('hex'),
    address: address!,
    wif,
  };
  
  // Save wallet to storage
  await saveWallet(wallet);
  
  return wallet;
}

/**
 * Get wallet balance from blockchain API
 */
export async function getWalletBalance(address: string): Promise<number> {
  try {
    // Using BlockCypher API (testnet)
    const response = await fetch(
      `https://api.blockcypher.com/v1/btc/test3/addrs/${address}/balance`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch balance');
    }
    
    const data = await response.json();
    // Convert satoshis to BTC
    return data.balance / 100000000;
  } catch (error) {
    console.error('Error fetching balance:', error);
    // Return 0 if API fails
    return 0;
  }
}

/**
 * Get transaction history for an address
 */
export async function getTransactionHistory(address: string): Promise<any[]> {
  try {
    const response = await fetch(
      `https://api.blockcypher.com/v1/btc/test3/addrs/${address}/full?limit=10`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch transactions');
    }
    
    const data = await response.json();
    return data.txs || [];
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
}

/**
 * Save wallet to AsyncStorage
 */
export async function saveWallet(wallet: Wallet): Promise<void> {
  try {
    await AsyncStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(wallet));
  } catch (error) {
    console.error('Error saving wallet:', error);
    throw error;
  }
}

/**
 * Load wallet from AsyncStorage
 */
export async function loadWallet(): Promise<Wallet | null> {
  try {
    const walletData = await AsyncStorage.getItem(WALLET_STORAGE_KEY);
    if (walletData) {
      return JSON.parse(walletData);
    }
    return null;
  } catch (error) {
    console.error('Error loading wallet:', error);
    return null;
  }
}

/**
 * Delete wallet from storage
 */
export async function deleteWallet(): Promise<void> {
  try {
    await AsyncStorage.removeItem(WALLET_STORAGE_KEY);
  } catch (error) {
    console.error('Error deleting wallet:', error);
    throw error;
  }
}

