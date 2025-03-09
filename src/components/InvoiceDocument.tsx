import { FontWeight } from "@cloudinary/url-gen/qualifiers";
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  pdf,
  Font,
  Image,
} from "@react-pdf/renderer";
import { FileDown } from "lucide-react";
import { createQuotation } from "../lib/docxCreation";
import { Enquiry } from "@/store/enquiryStore";
import { useAuthStore, UserData } from "@/store/authStore";
import { Customer, useCustomerStore } from "@/store/customerStore";

Font.register({
  family: "Poppins",
  fonts: [
    {
      src: "/fonts/Poppins-Regular.ttf",
    },
    {
      src: "/fonts/Poppins-Bold.ttf",
      fontWeight: "bold",
    },
    {
      src: "/fonts/Poppins-Medium.ttf",
      fontWeight: "medium",
    },
  ],
});

// Define styles
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 12,
    fontFamily: "Poppins",
    backgroundColor: "#F8FBFC",
  },
  header: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  logoSection: {
    display: "flex",
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  logoInfo: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
  },
  logo: {
    width: 40,
    height: 40,
  },
  businessAddress: {
    textAlign: "right",
    fontSize: 10,
    color: "#777",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2562EF",
  },
  subtitle: {
    fontSize: 10,
    color: "#777",
  },
  invoiceBody: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 30,
    paddingHorizontal: 20,
    border: 1,
    borderColor: "#F3F4F6",
    borderRadius: 20,
    marginVertical: 20,
  },
  invoiceInfo: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  boldText: {
    color: "#777",
    fontSize: 10,
    fontWeight: "medium",
  },
  grayText: {
    fontSize: 10,
    color: "#777",
  },
  valueText: {
    fontSize: 10,
    fontWeight : "medium"
  },
  amountText: {
    fontSize: 16,
    color: "#2562EF",
    fontWeight: "bold",
  },
  table: {
    width: "100%",
    marginTop: 15,
    borderCollapse: "collapse",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f3f3",
    padding: 5,
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1 solid #ddd",
    paddingVertical: 5,
  },
  columnHeader: {
    width: "25%",
    textAlign: "left",
    padding: 5,
  },
  column: {
    width: "25%",
    textAlign: "left",
    padding: 5,
  },
  totalSection: {
    marginTop: 15,
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  totalBox: {
    width: "40%",
    padding: 10,
    border: "1 solid #ddd",
    textAlign: "right",
  },
  footer: {
    marginTop: 20,
    fontSize: 10,
    textAlign: "center",
    color: "#777",
  },
  section: {
    marginTop: 15,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2562EF",
    marginBottom: 5,
  },
  text: {
    fontSize: 10,
    color: "#777",
  },
});

// Invoice component
const InvoiceDocument = ({ enquiry }: { enquiry: any }) => {
  const totalAmount = enquiry?.deliverables.reduce(
    (sum: number, d: any) => sum + d.total,
    0
  );
  const tax = totalAmount * 0.1; // Example: 10% tax
  const grandTotal = totalAmount + tax;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoSection}>
            <Image src={"/images/logo.png"} style={styles.logo} />
            <View style={styles.logoInfo}>
              <Text style={styles.title}>Shiptech</Text>
              <Text style={styles.subtitle}>www.website.com</Text>
              <Text style={styles.subtitle}>hello@email.com</Text>
              <Text style={styles.subtitle}>+91 00000 00000</Text>
            </View>
          </View>
          <View style={styles.businessAddress}>
            <Text>Business Address</Text>
            <Text>City, State, IN - 000 000</Text>
            <Text>TAX ID 0XXXXX1234X0XX</Text>
          </View>
        </View>

        {/* invoice body  */}
        <View style={styles.invoiceBody}>
          {/* Invoice Info */}
          <View style={styles.invoiceInfo}>
            <View>
              <Text style={styles.boldText}>Billed to</Text>
              <Text style={styles.valueText}>Company Name</Text>
              <Text style={styles.grayText}>Company address</Text>
              <Text style={styles.grayText}>City, Country - 00000</Text>
              <Text style={styles.grayText}>+0 (000) 123-4567</Text>
            </View>
            <View>
              <Text style={styles.boldText}>Invoice number</Text>
              <Text style={styles.valueText}>#AB2324-01</Text>
              <Text style={styles.boldText}>Reference</Text>
              <Text style={styles.valueText}>INV-057</Text>
            </View>
            <View>
              <Text style={styles.boldText}>Invoice of (USD)</Text>
              <Text style={styles.amountText}>${grandTotal}</Text>
            </View>
          </View>

          {/* Table */}
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.columnHeader}>Item Detail</Text>
              <Text style={styles.columnHeader}>Qty</Text>
              <Text style={styles.columnHeader}>Rate</Text>
              <Text style={styles.columnHeader}>Amount</Text>
            </View>

            {enquiry?.deliverables.map((item: any, index: number) => (
              <View style={styles.tableRow} key={index}>
                <Text style={styles.column}>{item.name}</Text>
                <Text style={styles.column}>{item.quantity}</Text>
                <Text style={styles.column}>${item.rate}</Text>
                <Text style={styles.column}>${item.total}</Text>
              </View>
            ))}
          </View>

          {/* Total */}
          <View style={styles.totalSection}>
            <View style={styles.totalBox}>
              <Text>Subtotal: ${totalAmount}</Text>
              <Text>Tax (10%): ${tax}</Text>
              <Text style={styles.amountText}>Total: ${grandTotal}</Text>
            </View>
          </View>

          {/* Customer Requirements */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer Requirements</Text>
            <Text style={styles.text}>
              {enquiry.requirements.replace(/<[^>]+>/g, '\n')}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Thanks for the business.</Text>
          <Text>
            Terms & Conditions: Please pay within 15 days of receiving this
            invoice.
          </Text>
        </View>
      </Page>
    </Document>
  );
};

const InvoiceDownloader = ({ enquiry }: { enquiry: Enquiry }) => {
  const { userData } = useAuthStore();
  const { fetchCustomer } = useCustomerStore();

  const downloadInvoice = async () => {
    if (!enquiry) return;

    const customer = await fetchCustomer(enquiry.customer_id);


   await createQuotation(enquiry , userData as UserData , customer as Customer);

    // const doc = <InvoiceDocument enquiry={enquiry} />;
    // const blob = await pdf(doc).toBlob();
    // const url = URL.createObjectURL(blob);

    // const link = document.createElement("a");
    // link.href = url;
    // link.download = "invoice.pdf";
    // document.body.appendChild(link);
    // link.click();
    // document.body.removeChild(link);
  };

  return (
    <button
      className="inline-flex items-center px-4 py-2  text-sm font-medium rounded-md text-black bg-white border-[1px]"
      onClick={downloadInvoice}
    >
      <FileDown className="mr-2 h-4 w-4" /> Download Quotation
    </button>
  );
};

export default InvoiceDownloader;
