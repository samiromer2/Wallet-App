// screens/WalletScreen.js
import { useState } from 'react';
import { Button, Text, View } from 'react-native';
//import BitcoinWallet from 'react-native-crypto';

const WalletScreen = () => {
  const [balance, setBalance] = useState(0);
  const [privateKey, setPrivateKey] = useState('');

  //
  const handleGenerateWallet = async () => {
    // const wallet = await BitcoinWallet.generate();
    // setPrivateKey(wallet.privateKey);
    // Update the balance with the generated wallet value
  };

  const handleSendTransaction = async () => {
    // Implement transaction sending logic here
  };

  return (
    <View>
      <Text>Balance: {balance}</Text>
      <Text>Private Key: {privateKey}</Text>
      <Button title="Generate Wallet" onPress={handleGenerateWallet} />
      <Button title="Send Transaction" onPress={handleSendTransaction} />
    </View>
  );
};

export default WalletScreen;
