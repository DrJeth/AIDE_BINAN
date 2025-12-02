// frontend/src/screens/Transaction.js
import React, { useState, useMemo } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ScrollView,
  Alert,
  Platform,
  Modal,
  Image,
} from "react-native";

const TRANSACTION_TYPES = [
  {
    id: "ebike_new",
    label: "Privately-Owned E-Bike — New",
    fees: [
      { label: "Registration Fee", amount: 100 },
      { label: "Permit/License Fee", amount: 150 },
      { label: "Metal Plate (one-time)", amount: 300 },
      { label: "Sticker (yearly)", amount: 90 },
    ],
  },
  {
    id: "ebike_renew",
    label: "Privately-Owned E-Bike — Renew",
    fees: [
      { label: "Registration Fee", amount: 50 },
      { label: "Permit/License Fee", amount: 120 },
      { label: "Metal Plate (one-time)", amount: 0 },
      { label: "Sticker (yearly)", amount: 90 },
    ],
  },
  {
    id: "commercial",
    label: "Commercial E-Bike",
    fees: [
      { label: "Registration Fee", amount: 200 },
      { label: "Permit/License Fee", amount: 250 },
      { label: "Metal Plate (one-time)", amount: 300 },
      { label: "Sticker (yearly)", amount: 120 },
    ],
  },
];

const DUMMY_HISTORY = [
  {
    id: "h1",
    title: "Privately-Owned E-Bike — New",
    amount: 640,
    reference: "No reference",
    date: "11/11/2025",
    time: "9:13:52 PM",
  },
  {
    id: "h2",
    title: "Commercial E-Bike",
    amount: 870,
    reference: "Plate ABC-123",
    date: "10/28/2025",
    time: "2:04:21 PM",
  },
];

function formatPeso(n) {
  return `₱${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

const DownloadIcon = require("../../assets/download-icon.png"); // add your asset
const LOGO = require("../../assets/logo-binan.png"); // reuse logo for receipt

export default function Transaction({ navigation }) {
  const [selectedTypeId, setSelectedTypeId] = useState(TRANSACTION_TYPES[0].id);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [reference, setReference] = useState("");
  const [history, setHistory] = useState(DUMMY_HISTORY);

  // receipt modal state
  const [receiptVisible, setReceiptVisible] = useState(false);
  const [receiptItem, setReceiptItem] = useState(null);

  const selectedType = useMemo(
    () => TRANSACTION_TYPES.find((t) => t.id === selectedTypeId) || TRANSACTION_TYPES[0],
    [selectedTypeId]
  );

  const total = useMemo(
    () => selectedType.fees.reduce((s, f) => s + (f.amount || 0), 0),
    [selectedType]
  );

  const handleReset = () => {
    setSelectedTypeId(TRANSACTION_TYPES[0].id);
    setReference("");
    setDropdownOpen(false);
  };

  const handlePay = () => {
    // simulate payment flow
    const newEntry = {
      id: `h${Date.now()}`,
      title: selectedType.label,
      amount: total,
      reference: reference || "No reference",
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      items: selectedType.fees,
      receiptNo: `R-${Date.now()}`,
    };

    setHistory((prev) => [newEntry, ...prev]);

    Alert.alert(
      "Payment simulated",
      `You have paid ${formatPeso(total)} for\n${selectedType.label}`,
      [{ text: "OK", onPress: () => {} }]
    );
  };

  const renderFeeRow = (fee) => {
    return (
      <View key={fee.label} style={styles.feeRow}>
        <Text style={styles.feeLabel}>{fee.label}</Text>
        <Text style={styles.feeAmount}>{formatPeso(fee.amount)}</Text>
      </View>
    );
  };

  const renderHistoryItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.historyItem}
      onPress={() => {
        // show this item's receipt preview when tapped
        setReceiptItem(item);
        setReceiptVisible(true);
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.historyTitle}>{item.title}</Text>
        <Text style={styles.historyRef}>{item.reference}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={styles.historyAmount}>{formatPeso(item.amount)}</Text>
        <Text style={styles.historyDate}>{`${item.date} • ${item.time}`}</Text>
      </View>
    </TouchableOpacity>
  );

  const openTopReceipt = () => {
    // choose the latest transaction for quick receipt preview
    if (history.length === 0) {
      Alert.alert("No transactions", "No transaction to show receipt for.");
      return;
    }
    setReceiptItem(history[0]);
    setReceiptVisible(true);
  };

  const handleDownloadReceipt = async () => {
    // Simulated download. Replace this with real PDF generation + save.
    // Example options: react-native-pdf-lib, react-native-html-to-pdf, expo-file-system + printToFileAsync
    setReceiptVisible(false);
    Alert.alert("Download", "Digital receipt download simulated.");
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.openDrawer?.()}>
          <Text style={styles.menuTxt}>≡</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction</Text>

        {/* digital receipt icon (top-right) */}
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            style={styles.receiptBtn}
            onPress={openTopReceipt}
            accessibilityLabel="Digital receipt"
          >
            <Image source={DownloadIcon} style={styles.receiptIcon} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Form card */}
        <View style={styles.card}>
          <Text style={styles.label}>Select Transaction Type</Text>

          {/* Custom dropdown */}
          <TouchableOpacity
            style={styles.dropdown}
            activeOpacity={0.8}
            onPress={() => setDropdownOpen((s) => !s)}
          >
            <Text style={styles.dropdownText}>{selectedType.label}</Text>
            <Text style={styles.dropdownChevron}>{dropdownOpen ? "▲" : "▼"}</Text>
          </TouchableOpacity>

          {dropdownOpen && (
            <View style={styles.dropdownList}>
              {TRANSACTION_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.dropdownItem,
                    t.id === selectedTypeId ? styles.dropdownItemActive : null,
                  ]}
                  onPress={() => {
                    setSelectedTypeId(t.id);
                    setDropdownOpen(false);
                  }}
                >
                  <Text style={styles.dropdownItemText}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={[styles.label, { marginTop: 12 }]}>Reference (Plate / Owner)</Text>
          <TextInput
            placeholder="Plate number or owner name"
            style={styles.input}
            value={reference}
            onChangeText={setReference}
          />

          <View style={styles.fees}>
            {selectedType.fees.map(renderFeeRow)}
            <View style={styles.divider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount}>{formatPeso(total)}</Text>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.payBtn} onPress={handlePay}>
                <Text style={styles.payBtnText}>Pay (simulate)</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
                <Text style={styles.resetTxt}>Reset</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Transaction History */}
        <Text style={styles.sectionTitle}>Transaction History</Text>

        <FlatList
          data={history}
          keyExtractor={(i) => i.id}
          renderItem={renderHistoryItem}
          contentContainerStyle={{ paddingBottom: 80 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      </ScrollView>

      {/* Receipt Modal with PDF-styled receipt */}
      <Modal visible={receiptVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Digital Receipt</Text>
              <TouchableOpacity onPress={() => setReceiptVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {receiptItem ? (
              <>
                {/* PDF-like white paper area */}
                <View style={styles.pdfPaper}>
                  {/* Header row with logo and org */}
                  <View style={styles.pdfHeader}>
                    <Image source={LOGO} style={styles.pdfLogo} />
                    <View style={{ flex: 1, paddingLeft: 10 }}>
                      <Text style={styles.pdfOrg}>AIDE | City Transport Office</Text>
                      <Text style={styles.pdfSmall}>Official Digital Receipt</Text>
                    </View>
                  </View>

                  <View style={styles.pdfMeta}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pdfMetaLabel}>Receipt No.</Text>
                      <Text style={styles.pdfMetaValue}>{receiptItem.receiptNo || `R-${receiptItem.id}`}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pdfMetaLabel}>Date</Text>
                      <Text style={styles.pdfMetaValue}>{receiptItem.date}</Text>
                      <Text style={styles.pdfMetaLabel}>Time</Text>
                      <Text style={styles.pdfMetaValue}>{receiptItem.time}</Text>
                    </View>
                  </View>

                  {/* Table header */}
                  <View style={styles.pdfTableHeader}>
                    <Text style={[styles.pdfCell, { flex: 1 }]}>Description</Text>
                    <Text style={[styles.pdfCell, { width: 90, textAlign: "right" }]}>Amount</Text>
                  </View>

                  {/* Table rows */}
                  <View style={styles.pdfTable}>
                    {(receiptItem.items || receiptItem.items === undefined
                      ? receiptItem.items || selectedType.fees
                      : selectedType.fees
                    ).map((row, idx) => (
                      <View style={styles.pdfRow} key={`${row.label}-${idx}`}>
                        <Text style={[styles.pdfCell, { flex: 1 }]}>{row.label}</Text>
                        <Text style={[styles.pdfCell, { width: 90, textAlign: "right" }]}>{formatPeso(row.amount)}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.pdfDivider} />

                  <View style={styles.pdfTotals}>
                    <Text style={styles.pdfTotalLabel}>Total</Text>
                    <Text style={styles.pdfTotalAmount}>{formatPeso(receiptItem.amount)}</Text>
                  </View>

                  <View style={styles.pdfFooter}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pdfFooterLabel}>Payer/Reference</Text>
                      <Text style={styles.pdfFooterValue}>{receiptItem.reference}</Text>
                    </View>

                    <View style={styles.pdfQr}>
                      <View style={styles.pdfQrBox}>
                        <Text style={{ fontSize: 10, color: "#666" }}>QR</Text>
                      </View>
                      <Text style={styles.pdfQrText}>Receipt ID</Text>
                    </View>
                  </View>
                </View>

                {/* Download / Close */}
                <View style={{ flexDirection: "row", marginTop: 12 }}>
                  <TouchableOpacity style={styles.downloadBtn} onPress={handleDownloadReceipt}>
                    <Image source={DownloadIcon} style={{ width: 18, height: 18, marginRight: 8 }} />
                    <Text style={styles.downloadTxt}>Download</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.downloadBtn, { backgroundColor: "#fff", borderWidth: 1, borderColor: "#ddd", marginLeft: 10 }]}
                    onPress={() => setReceiptVisible(false)}
                  >
                    <Text style={[styles.downloadTxt, { color: "#333" }]}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <Text style={{ color: "#666" }}>No receipt selected.</Text>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const GREEN = "#2e7d32";
const LIGHT_GREEN = "#eaf7ed";
const CARD_BG = "#ffffff";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: LIGHT_GREEN },
  header: {
    height: 64,
    backgroundColor: GREEN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  menuTxt: { color: "#fff", fontSize: 20 },
  headerTitle: { color: "#fff", fontWeight: "700", fontSize: 18 },

  receiptBtn: {
    width: 40,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  receiptIcon: { width: 22, height: 22, tintColor: "#fff" },

  content: { padding: 12, paddingBottom: 24 },

  card: {
    backgroundColor: CARD_BG,
    borderRadius: 10,
    padding: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    marginBottom: 14,
  },

  label: { color: "#333", fontWeight: "700", marginBottom: 8 },

  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderColor: "#dcdcdc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    backgroundColor: "#fff",
  },
  dropdownText: { color: "#333", flex: 1 },
  dropdownChevron: { color: "#666", marginLeft: 8 },

  dropdownList: {
    borderColor: "#dcdcdc",
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 8,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  dropdownItem: { padding: 12 },
  dropdownItemActive: { backgroundColor: "#f0fff0" },
  dropdownItemText: { color: "#333" },

  input: {
    borderColor: "#dcdcdc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    backgroundColor: "#fff",
  },

  fees: { marginTop: 12 },
  feeRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 6 },
  feeLabel: { color: "#333" },
  feeAmount: { color: "#0b6b2f", fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 10 },

  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalLabel: { color: "#333", fontWeight: "800", fontSize: 16 },
  totalAmount: { color: "#0b6b2f", fontWeight: "900", fontSize: 16 },

  buttonRow: { flexDirection: "row", marginTop: 12, alignItems: "center" },
  payBtn: {
    backgroundColor: GREEN,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    marginRight: 12,
    flex: 1,
    alignItems: "center",
  },
  payBtnText: { color: "#fff", fontWeight: "700" },

  resetBtn: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dcdcdc",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  resetTxt: { color: "#333", fontWeight: "700" },

  sectionTitle: { color: GREEN, fontWeight: "800", marginBottom: 8, marginTop: 6 },

  historyItem: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  historyTitle: { fontWeight: "700", color: "#113e21", marginBottom: 4 },
  historyRef: { color: "#9e9e9e", fontSize: 12 },
  historyAmount: { color: "#0b6b2f", fontWeight: "800" },
  historyDate: { color: "#9e9e9e", fontSize: 11, marginTop: 6 },

  /* modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    maxHeight: "90%",
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontWeight: "800", color: "#113e21", fontSize: 16 },
  modalClose: { fontSize: 20, color: "#999" },

  /* pdf-styled paper */
  pdfPaper: {
    backgroundColor: "#fff",
    borderRadius: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e6e6e6",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  pdfHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  pdfLogo: { width: 56, height: 56, borderRadius: 6 },
  pdfOrg: { fontWeight: "800", color: "#113e21" },
  pdfSmall: { color: "#666", fontSize: 12 },

  pdfMeta: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  pdfMetaLabel: { color: "#666", fontSize: 12 },
  pdfMetaValue: { fontWeight: "700", color: "#333" },

  pdfTableHeader: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  pdfTable: { marginTop: 6 },
  pdfRow: { flexDirection: "row", paddingVertical: 8 },
  pdfCell: { color: "#333", fontSize: 13 },

  pdfDivider: { height: 1, backgroundColor: "#eee", marginVertical: 8 },

  pdfTotals: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pdfTotalLabel: { fontWeight: "800", fontSize: 16 },
  pdfTotalAmount: { fontWeight: "900", fontSize: 16, color: "#0b6b2f" },

  pdfFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, alignItems: "center" },
  pdfFooterLabel: { color: "#666", fontSize: 12 },
  pdfFooterValue: { color: "#333", fontWeight: "700" },

  pdfQr: { alignItems: "center" },
  pdfQrBox: { width: 64, height: 64, backgroundColor: "#f5f5f5", alignItems: "center", justifyContent: "center", borderRadius: 6, borderWidth: 1, borderColor: "#eee" },
  pdfQrText: { fontSize: 11, color: "#666", marginTop: 6 },

  downloadBtn: {
    backgroundColor: GREEN,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  downloadTxt: { color: "#fff", fontWeight: "700" },
});
