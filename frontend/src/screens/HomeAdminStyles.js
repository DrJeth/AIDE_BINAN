import { StyleSheet, Dimensions } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DRAWER_WIDTH = Math.min(340, Math.round(SCREEN_WIDTH * 0.86));

export default StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#fff" 
  },

  // Top Bar
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#19662f",
    zIndex: 10,
  },
  headerInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  brandWrap: { 
    flex: 1, 
    alignItems: "center" 
  },
  brand: { 
    color: "#fff", 
    fontSize: 20, 
    fontWeight: "800" 
  },

  // Content
  safeContent: { 
    flex: 1 
  },
  content: { 
    padding: 14, 
    backgroundColor: "#fff" 
  },
  greeting: { 
    fontSize: 50, 
    fontWeight: "700", 
    color: "#113e21", 
    marginBottom: 10 
  },

  // Cards
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#eee",
    marginBottom: 12,
  },
  cardTitle: { 
    fontSize: 16, 
    fontWeight: "700", 
    color: "#113e21" 
  },
  cardSub: { 
    fontSize: 12, 
    color: "#777", 
    marginBottom: 8 
  },
  greenBtn: {
    backgroundColor: "#0b7830",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  greenBtnTxt: { 
    color: "#fff", 
    fontWeight: "700" 
  },

  hint: { 
    color: "#555", 
    marginBottom: 8 
  },
  fileRow: { 
    flexDirection: "row", 
    alignItems: "center" 
  },
  fileName: { 
    flex: 1, 
    color: "#666" 
  },
  cameraBtn: { 
    padding: 8, 
    backgroundColor: "#0b7830", 
    borderRadius: 8 
  },
  cameraTxt: { 
    color: "#fff", 
    fontSize: 16 
  },
  tip: { 
    fontSize: 12, 
    color: "#666", 
    marginTop: 6 
  },
  cardDate: { 
    color: "#888", 
    marginTop: 6 
  },

  // Bottom Navigation
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#19662f",
    zIndex: 20,
  },
  bottomSafe: { 
    flex: 1 
  },
  bottomInner: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-around" 
  },
  tabItem: { 
    flex: 1, 
    alignItems: "center", 
    justifyContent: "center" 
  },
  tabIconImage: { 
    width: 28, 
    height: 28, 
    marginBottom: 4 
  },
  tabTxt: { 
    color: "#fff", 
    fontSize: 12, 
    fontWeight: "700" 
  },

  // Drawer Backdrop
  drawerBackdrop: { 
    ...StyleSheet.absoluteFillObject, 
    zIndex: 50, 
    backgroundColor: "#000" 
  },
  fullBackdrop: { 
    flex: 1 
  },

  // Drawer Panel
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "transparent",
    zIndex: 60,
    elevation: 20,
  },

  // Drawer Header
  drawerHeaderWrap: {},
  drawerHeaderGreen: {
    backgroundColor: "#19662f",
    height: 140,
    borderBottomRightRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 12,
  },
  headerLogo: {
    width: 90,
    height: 90,
    borderRadius: 90,
    backgroundColor: "transparent",
  },

  // Profile Card
  profileCard: {
    position: "absolute",
    left: 18,
    right: 18,
    top: 100,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "#eee",
  },
  profileAvatar: { 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    marginRight: 12 
  },
  profileInfo: { 
    flex: 1 
  },
  profileName: { 
    fontSize: 16, 
    fontWeight: "700", 
    color: "#113e21" 
  },
  profileEmail: { 
    fontSize: 12, 
    color: "#666", 
    marginTop: 2 
  },

  // Drawer List
  drawerList: {
    backgroundColor: "#fff",
    marginTop: 64,
    paddingHorizontal: 6,
  },

  // Menu Items
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: "#fff",
    marginHorizontal: 6,
    borderRadius: 6,
  },
  menuIconImage: {
    width: 22,
    height: 22,
    marginRight: 14,
  },
  menuText: { 
    flex: 1, 
    fontSize: 16, 
    fontWeight: "700", 
    color: "#113e21" 
  },
  menuChevron: { 
    color: "#999", 
    fontSize: 20 
  },

  menuDivider: { 
    height: 1, 
    backgroundColor: "#eee", 
    marginVertical: 10, 
    marginHorizontal: 12 
  },

  smallItem: { 
    paddingVertical: 10, 
    paddingHorizontal: 18, 
    marginHorizontal: 6 
  },
  smallItemText: { 
    color: "#666", 
    fontSize: 14 
  },

  // Logout Box
  logoutWrap: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: "transparent",
  },
  logoutBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#eee",
    elevation: 2,
  },
  logoutIconImage: { 
    width: 26, 
    height: 26, 
    marginRight: 12 
  },
  logoutTitle: { 
    fontSize: 16, 
    fontWeight: "700", 
    color: "#113e21" 
  },
  logoutSubtitle: { 
    fontSize: 12, 
    color: "#666", 
    marginTop: 4 
  },
});