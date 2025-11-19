import 'react-native-get-random-values';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import {
  generateWallet,
  importWalletFromMnemonic,
  getWalletBalance,
  getTransactionHistory,
  loadWallet,
  deleteWallet,
  type Wallet,
} from '@/services/walletService';

export default function WalletScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [mnemonicInput, setMnemonicInput] = useState('');
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    loadExistingWallet();
  }, []);

  useEffect(() => {
    if (wallet?.address) {
      fetchBalance();
      fetchTransactions();
    }
  }, [wallet]);

  const loadExistingWallet = async () => {
    try {
      const existingWallet = await loadWallet();
      if (existingWallet) {
        setWallet(existingWallet);
      }
    } catch (error) {
      console.error('Error loading wallet:', error);
    }
  };

  const fetchBalance = async () => {
    if (!wallet?.address) return;
    
    setBalanceLoading(true);
    try {
      const btcBalance = await getWalletBalance(wallet.address);
      setBalance(btcBalance);
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setBalanceLoading(false);
    }
  };

  const fetchTransactions = async () => {
    if (!wallet?.address) return;
    
    try {
      const txs = await getTransactionHistory(wallet.address);
      setTransactions(txs);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const handleGenerateWallet = async () => {
    setLoading(true);
    try {
      const newWallet = await generateWallet();
      setWallet(newWallet);
      setShowMnemonic(true);
      Alert.alert(
        'Wallet Created',
        'Your wallet has been created successfully! Please save your mnemonic phrase securely.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error generating wallet:', error);
      Alert.alert('Error', 'Failed to generate wallet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleImportWallet = async () => {
    if (!mnemonicInput.trim()) {
      Alert.alert('Error', 'Please enter a mnemonic phrase');
      return;
    }

    setLoading(true);
    try {
      const importedWallet = await importWalletFromMnemonic(mnemonicInput.trim());
      setWallet(importedWallet);
      setShowImport(false);
      setMnemonicInput('');
      Alert.alert('Success', 'Wallet imported successfully!');
    } catch (error: any) {
      console.error('Error importing wallet:', error);
      Alert.alert('Error', error.message || 'Failed to import wallet. Please check your mnemonic phrase.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWallet = () => {
    Alert.alert(
      'Delete Wallet',
      'Are you sure you want to delete this wallet? This action cannot be undone. Make sure you have saved your mnemonic phrase.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWallet();
              setWallet(null);
              setBalance(0);
              setShowMnemonic(false);
              setTransactions([]);
              Alert.alert('Success', 'Wallet deleted successfully');
            } catch (error) {
              console.error('Error deleting wallet:', error);
              Alert.alert('Error', 'Failed to delete wallet');
            }
          },
        },
      ]
    );
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('Copied', `${label} copied to clipboard`);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      Alert.alert('Error', 'Failed to copy to clipboard');
    }
  };

  if (!wallet) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.welcomeContainer}>
          <Text style={[styles.title, { color: theme.text }]}>Bitcoin Wallet</Text>
          <Text style={[styles.subtitle, { color: theme.icon }]}>
            Create or import a Bitcoin wallet to get started
          </Text>
        </View>

        {!showImport ? (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton, { backgroundColor: theme.tint }]}
              onPress={handleGenerateWallet}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Generate New Wallet</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton, { borderColor: theme.tint }]}
              onPress={() => setShowImport(true)}
            >
              <Text style={[styles.buttonTextSecondary, { color: theme.tint }]}>
                Import Existing Wallet
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.importContainer}>
            <Text style={[styles.label, { color: theme.text }]}>Enter Mnemonic Phrase</Text>
            <TextInput
              style={[
                styles.mnemonicInput,
                { backgroundColor: theme.background, color: theme.text, borderColor: theme.icon },
              ]}
              multiline
              numberOfLines={4}
              placeholder="Enter your 12-word mnemonic phrase"
              placeholderTextColor={theme.icon}
              value={mnemonicInput}
              onChangeText={setMnemonicInput}
              autoCapitalize="none"
            />
            <View style={styles.importButtons}>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton, { backgroundColor: theme.tint }]}
                onPress={handleImportWallet}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Import Wallet</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton, { borderColor: theme.icon }]}
                onPress={() => {
                  setShowImport(false);
                  setMnemonicInput('');
                }}
              >
                <Text style={[styles.buttonTextSecondary, { color: theme.icon }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Balance Card */}
      <View style={[styles.balanceCard, { backgroundColor: theme.tint + '20' }]}>
        <Text style={[styles.balanceLabel, { color: theme.icon }]}>Balance</Text>
        {balanceLoading ? (
          <ActivityIndicator size="large" color={theme.tint} style={styles.balanceLoader} />
        ) : (
          <Text style={[styles.balanceAmount, { color: theme.tint }]}>
            {balance.toFixed(8)} BTC
          </Text>
        )}
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={fetchBalance}
          disabled={balanceLoading}
        >
          <Text style={[styles.refreshText, { color: theme.tint }]}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {/* Wallet Address */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Wallet Address</Text>
        <TouchableOpacity
          style={[styles.addressContainer, { backgroundColor: theme.background, borderColor: theme.icon }]}
          onPress={() => copyToClipboard(wallet.address, 'Address')}
        >
          <Text style={[styles.addressText, { color: theme.text }]} numberOfLines={1}>
            {wallet.address}
          </Text>
          <Text style={[styles.copyText, { color: theme.tint }]}>Tap to copy</Text>
        </TouchableOpacity>
      </View>

      {/* Mnemonic Phrase */}
      {showMnemonic && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Mnemonic Phrase</Text>
          <View style={[styles.mnemonicContainer, { backgroundColor: theme.background, borderColor: theme.icon }]}>
            <Text style={[styles.mnemonicText, { color: theme.text }]}>
              {wallet.mnemonic}
            </Text>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={() => copyToClipboard(wallet.mnemonic, 'Mnemonic')}
            >
              <Text style={[styles.copyButtonText, { color: theme.tint }]}>Copy</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.warningText, { color: '#ff6b6b' }]}>
            ⚠️ Keep this phrase secure. Anyone with access to it can control your wallet.
          </Text>
        </View>
      )}

      {/* Transactions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Transactions</Text>
        {transactions.length === 0 ? (
          <Text style={[styles.emptyText, { color: theme.icon }]}>
            No transactions yet
          </Text>
        ) : (
          transactions.slice(0, 5).map((tx, index) => (
            <View
              key={index}
              style={[styles.transactionItem, { backgroundColor: theme.background, borderColor: theme.icon }]}
            >
              <Text style={[styles.txHash, { color: theme.text }]} numberOfLines={1}>
                {tx.hash}
              </Text>
              <Text style={[styles.txDate, { color: theme.icon }]}>
                {new Date(tx.confirmed || tx.received).toLocaleDateString()}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        {!showMnemonic && (
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton, { borderColor: theme.icon }]}
            onPress={() => setShowMnemonic(true)}
          >
            <Text style={[styles.buttonTextSecondary, { color: theme.icon }]}>
              Show Mnemonic
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.button, styles.dangerButton, { borderColor: '#ff6b6b' }]}
          onPress={handleDeleteWallet}
        >
          <Text style={[styles.buttonTextSecondary, { color: '#ff6b6b' }]}>
            Delete Wallet
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  welcomeContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 16,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  primaryButton: {
    backgroundColor: '#0a7ea4',
  },
  secondaryButton: {
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  dangerButton: {
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
  },
  importContainer: {
    gap: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  mnemonicInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  importButtons: {
    gap: 12,
  },
  balanceCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  balanceLoader: {
    marginVertical: 20,
  },
  refreshButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  refreshText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  addressContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  addressText: {
    fontSize: 14,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  copyText: {
    fontSize: 12,
  },
  mnemonicContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
  },
  mnemonicText: {
    fontSize: 14,
    lineHeight: 24,
    marginBottom: 12,
  },
  copyButton: {
    alignSelf: 'flex-end',
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  warningText: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  transactionItem: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  txHash: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  txDate: {
    fontSize: 12,
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  actionsContainer: {
    gap: 12,
    marginTop: 8,
    marginBottom: 40,
  },
});

