import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from '../components/Card';
import Button from '../components/Button';
import StatCard from '../components/StatCard';
import { theme } from '../theme/theme';
import { formatVND } from '../utils/format';

export interface Employee {
  id: string;
  code: string;
  fullName: string;
  department: string;
  position: string;
  baseSalary: number;
  seniorityAllowance: number;
  livingAllowance: number;
  status: 'ACTIVE' | 'ON_LEAVE' | 'PROBATION';
  joinDate: string;
}

const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'emp_1',
    code: 'HJ-001',
    fullName: 'Hoàng Văn Tuấn',
    department: 'Xưởng Sản Xuất 1',
    position: 'Tổ trưởng kỹ thuật',
    baseSalary: 13000000,
    seniorityAllowance: 700000,
    livingAllowance: 500000,
    status: 'ACTIVE',
    joinDate: '2021-03-15',
  },
  {
    id: 'emp_2',
    code: 'HJ-002',
    fullName: 'Lê Thị Thu Thảo',
    department: 'Phòng Quản Lý Chất Lượng (QC)',
    position: 'Chuyên viên kiểm tra',
    baseSalary: 11500000,
    seniorityAllowance: 500000,
    livingAllowance: 500000,
    status: 'ACTIVE',
    joinDate: '2022-06-01',
  },
  {
    id: 'emp_3',
    code: 'HJ-003',
    fullName: 'Trần Minh Hoàng',
    department: 'Xưởng Cơ Khí & Bảo Trì',
    position: 'Kỹ sư bảo trì thiết bị',
    baseSalary: 14000000,
    seniorityAllowance: 1000000,
    livingAllowance: 600000,
    status: 'ACTIVE',
    joinDate: '2020-01-10',
  },
  {
    id: 'emp_4',
    code: 'HJ-004',
    fullName: 'Đặng Ngọc Ánh',
    department: 'Phòng Hành Chính & Nhân Sự',
    position: 'Chuyên viên nhân sự',
    baseSalary: 10500000,
    seniorityAllowance: 300000,
    livingAllowance: 400000,
    status: 'ACTIVE',
    joinDate: '2023-04-20',
  },
  {
    id: 'emp_5',
    code: 'HJ-005',
    fullName: 'Phạm Đức Dũng',
    department: 'Xưởng Sản Xuất 2',
    position: 'Công nhân vận hành máy',
    baseSalary: 9500000,
    seniorityAllowance: 200000,
    livingAllowance: 500000,
    status: 'PROBATION',
    joinDate: '2026-09-01',
  },
];

export default function EmployeesScreen() {
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const departments = useMemo(() => {
    const list = Array.from(new Set(employees.map((e) => e.department)));
    return ['ALL', ...list];
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((e) => {
      const matchSearch =
        !search ||
        e.code.toLowerCase().includes(search.toLowerCase()) ||
        e.fullName.toLowerCase().includes(search.toLowerCase()) ||
        e.position.toLowerCase().includes(search.toLowerCase());

      const matchDept = deptFilter === 'ALL' || e.department === deptFilter;
      return matchSearch && matchDept;
    });
  }, [employees, search, deptFilter]);

  const stats = useMemo(() => {
    const total = employees.length;
    const active = employees.filter((e) => e.status === 'ACTIVE').length;
    const probation = employees.filter((e) => e.status === 'PROBATION').length;
    const totalSalaryFund = employees.reduce((sum, e) => sum + e.baseSalary, 0);
    return { total, active, probation, totalSalaryFund };
  }, [employees]);

  const handleOpenAdd = () => {
    setEditingEmp({
      id: `emp_${Date.now()}`,
      code: `HJ-00${employees.length + 1}`,
      fullName: '',
      department: 'Xưởng Sản Xuất 1',
      position: 'Công nhân',
      baseSalary: 10000000,
      seniorityAllowance: 0,
      livingAllowance: 500000,
      status: 'ACTIVE',
      joinDate: new Date().toISOString().slice(0, 10),
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!editingEmp || !editingEmp.fullName.trim()) {
      return Alert.alert('Lỗi', 'Vui lòng nhập họ và tên nhân viên');
    }
    setEmployees((prev) => {
      const idx = prev.findIndex((e) => e.id === editingEmp.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = editingEmp;
        return copy;
      }
      return [editingEmp, ...prev];
    });
    setIsModalOpen(false);
    setEditingEmp(null);
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Xác nhận xóa', `Bạn có chắc muốn xóa nhân viên ${name} khỏi hệ thống?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => {
          setEmployees((prev) => prev.filter((e) => e.id !== id));
        },
      },
    ]);
  };

  const kpiWidth = isDesktop ? ('23.8%' as const) : width >= 380 ? ('48.2%' as const) : ('100%' as const);

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.pageHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}>
              <Ionicons name="people" size={22} color={theme.colors.primary} />
            </View>
            <View>
              <Text style={styles.pageTitle}>HỒ SƠ NHÂN SỰ HOJEONG</Text>
              <Text style={styles.pageSubtitle}>
                Quản lý danh sách nhân viên, chức vụ, bộ phận và cơ chế đãi ngộ
              </Text>
            </View>
          </View>
          <Button
            title="Thêm nhân sự mới"
            variant="primary"
            size="md"
            icon={<Ionicons name="person-add-outline" size={16} color={theme.colors.white} />}
            onPress={handleOpenAdd}
          />
        </View>

        {/* KPI Summary */}
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCol, { width: kpiWidth }]}>
            <StatCard
              title="TỔNG NHÂN SỰ"
              value={`${stats.total} nhân viên`}
              subtitle="Quy mô hiện tại"
              tone={theme.colors.primary}
              icon={<Ionicons name="people" size={16} color={theme.colors.primary} />}
            />
          </View>
          <View style={[styles.kpiCol, { width: kpiWidth }]}>
            <StatCard
              title="CHÍNH THỨC"
              value={`${stats.active}`}
              subtitle="Đang làm việc"
              tone={theme.colors.success}
              icon={<Ionicons name="checkmark-circle-outline" size={16} color={theme.colors.success} />}
            />
          </View>
          <View style={[styles.kpiCol, { width: kpiWidth }]}>
            <StatCard
              title="THỬ VIỆC / TẬP SỰ"
              value={`${stats.probation}`}
              subtitle="Nhân sự mới"
              tone={theme.colors.warning}
              icon={<Ionicons name="school-outline" size={16} color={theme.colors.warning} />}
            />
          </View>
          <View style={[styles.kpiCol, { width: kpiWidth }]}>
            <StatCard
              title="QUỸ LƯƠNG CƠ BẢN"
              value={formatVND(stats.totalSalaryFund)}
              subtitle="Tháng hiện tại"
              tone={theme.colors.purple}
              icon={<Ionicons name="wallet-outline" size={16} color={theme.colors.purple} />}
            />
          </View>
        </View>

        {/* Toolbar */}
        <Card style={styles.toolbarCard}>
          <View style={styles.toolbarRow}>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={18} color={theme.colors.slate400} />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm theo mã NV, họ tên, vị trí..."
                placeholderTextColor={theme.colors.slate400}
                value={search}
                onChangeText={setSearch}
              />
              {search ? (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={16} color={theme.colors.slate400} />
                </TouchableOpacity>
              ) : null}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.deptScroll}>
              {departments.map((dept) => (
                <TouchableOpacity
                  key={dept}
                  style={[styles.deptPill, deptFilter === dept && styles.deptPillActive]}
                  onPress={() => setDeptFilter(dept)}
                >
                  <Text style={[styles.deptText, deptFilter === dept && styles.deptTextActive]}>
                    {dept === 'ALL' ? 'Tất cả phòng ban' : dept}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Card>

        {/* Employee Table */}
        <Card style={styles.tableCard}>
          <View style={styles.tableHeaderRow}>
            <View style={styles.tableHeaderTitleRow}>
              <Ionicons name="card-outline" size={18} color={theme.colors.primary} />
              <Text style={styles.tableTitle}>DANH SÁCH NHÂN SỰ DOANH NGHIỆP</Text>
            </View>
            <Text style={styles.recordCountText}>
              {filteredEmployees.length} nhân viên
            </Text>
          </View>

          <View style={styles.table}>
            <View style={styles.tHead}>
              <Text style={[styles.th, { width: 90 }]}>MÃ NV</Text>
              <Text style={[styles.th, { width: 160 }]}>HỌ VÀ TÊN</Text>
              <Text style={[styles.th, { width: 170 }]}>PHÒNG BAN</Text>
              <Text style={[styles.th, { width: 150 }]}>VỊ TRÍ</Text>
              <Text style={[styles.th, { width: 120, textAlign: 'right' }]}>LƯƠNG CƠ BẢN</Text>
              <Text style={[styles.th, { width: 110, textAlign: 'center' }]}>TRẠNG THÁI</Text>
              <Text style={[styles.th, { width: 90, textAlign: 'center' }]}>THAO TÁC</Text>
            </View>

            {filteredEmployees.map((emp, idx) => (
              <View
                key={emp.id}
                style={[styles.tRow, idx % 2 === 1 && styles.tRowAlt]}
              >
                <Text style={[styles.td, styles.codeCell, { width: 90 }]}>{emp.code}</Text>
                <View style={[{ width: 160 }]}>
                  <Text style={[styles.td, styles.nameCell]}>{emp.fullName}</Text>
                  <Text style={styles.subText}>Gia nhập: {emp.joinDate}</Text>
                </View>
                <Text style={[styles.td, { width: 170 }]} numberOfLines={1}>{emp.department}</Text>
                <Text style={[styles.td, { width: 150 }]} numberOfLines={1}>{emp.position}</Text>
                <Text style={[styles.td, styles.salaryCell, { width: 120, textAlign: 'right' }]}>
                  {formatVND(emp.baseSalary)}
                </Text>
                <View style={[{ width: 110, alignItems: 'center' }]}>
                  <View
                    style={[
                      styles.statusBadge,
                      emp.status === 'ACTIVE'
                        ? styles.statusActive
                        : styles.statusProbation,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        emp.status === 'ACTIVE'
                          ? styles.statusActiveText
                          : styles.statusProbationText,
                      ]}
                    >
                      {emp.status === 'ACTIVE' ? 'Chính thức' : 'Thử việc'}
                    </Text>
                  </View>
                </View>
                <View style={[{ width: 90, flexDirection: 'row', justifyContent: 'center', gap: 8 }]}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => {
                      setEditingEmp({ ...emp });
                      setIsModalOpen(true);
                    }}
                  >
                    <Ionicons name="create-outline" size={17} color={theme.colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleDelete(emp.id, emp.fullName)}
                  >
                    <Ionicons name="trash-outline" size={17} color={theme.colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>

      {/* Add / Edit Employee Modal */}
      <Modal visible={isModalOpen} transparent animationType="fade" onRequestClose={() => setIsModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitle}>
                <Ionicons name="person" size={20} color={theme.colors.primary} />
                <Text style={styles.modalTitleText}>
                  {editingEmp && employees.some((e) => e.id === editingEmp.id)
                    ? 'Chỉnh sửa nhân sự'
                    : 'Thêm nhân sự mới'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <Ionicons name="close" size={22} color={theme.colors.slate400} />
              </TouchableOpacity>
            </View>

            {editingEmp && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>MÃ NHÂN VIÊN</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editingEmp.code}
                    onChangeText={(t) => setEditingEmp({ ...editingEmp, code: t })}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>HỌ VÀ TÊN</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Nhập họ và tên đầy đủ..."
                    value={editingEmp.fullName}
                    onChangeText={(t) => setEditingEmp({ ...editingEmp, fullName: t })}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>PHÒNG BAN / PHÂN XƯỞNG</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editingEmp.department}
                    onChangeText={(t) => setEditingEmp({ ...editingEmp, department: t })}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>VỊ TRÍ CÔNG TÁC</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editingEmp.position}
                    onChangeText={(t) => setEditingEmp({ ...editingEmp, position: t })}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>LƯƠNG CƠ BẢN (VNĐ)</Text>
                  <TextInput
                    style={styles.formInput}
                    keyboardType="numeric"
                    value={String(editingEmp.baseSalary)}
                    onChangeText={(t) => {
                      const num = parseInt(t.replace(/\D/g, ''), 10) || 0;
                      setEditingEmp({ ...editingEmp, baseSalary: num });
                    }}
                  />
                </View>

                <View style={styles.modalActions}>
                  <Button
                    title="LƯU HỒ SƠ"
                    variant="primary"
                    size="md"
                    onPress={handleSave}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="HỦY BỎ"
                    variant="secondary"
                    size="md"
                    onPress={() => setIsModalOpen(false)}
                    style={{ width: 100 }}
                  />
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollArea: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 32,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.colors.slate900,
    letterSpacing: 0.3,
  },
  pageSubtitle: {
    fontSize: 12,
    color: theme.colors.slate500,
    marginTop: 2,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  kpiCol: {
    marginBottom: 2,
  },
  toolbarCard: {
    padding: 12,
    borderRadius: theme.radius.lg,
  },
  toolbarRow: {
    flexDirection: 'column',
    gap: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.slate50,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 10,
    height: 38,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.slate900,
  },
  deptScroll: {
    flexDirection: 'row',
    gap: 6,
  },
  deptPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.slate100,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  deptPillActive: {
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.primary,
  },
  deptText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.slate600,
  },
  deptTextActive: {
    color: theme.colors.primary,
  },
  tableCard: {
    padding: 16,
    borderRadius: theme.radius.xl,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  tableHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tableTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: theme.colors.slate900,
    letterSpacing: 0.3,
  },
  recordCountText: {
    fontSize: 11,
    color: theme.colors.slate500,
    fontWeight: '600',
  },
  table: {
    marginTop: 8,
  },
  tHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1.5,
    borderColor: theme.colors.border,
  },
  th: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.slate500,
    letterSpacing: 0.5,
  },
  tRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  tRowAlt: {
    backgroundColor: theme.colors.slate50,
  },
  td: {
    fontSize: 12,
    color: theme.colors.slate800,
    fontWeight: '600',
  },
  codeCell: {
    fontWeight: '800',
    color: theme.colors.primary,
  },
  nameCell: {
    fontWeight: '800',
    color: theme.colors.slate900,
  },
  subText: {
    fontSize: 10,
    color: theme.colors.slate400,
    marginTop: 1,
  },
  salaryCell: {
    fontWeight: '800',
    color: theme.colors.slate900,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusActive: {
    backgroundColor: theme.colors.successSoft,
    borderWidth: 1,
    borderColor: theme.colors.successBorder,
  },
  statusActiveText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.successDark,
  },
  statusProbation: {
    backgroundColor: theme.colors.warningSoft,
    borderWidth: 1,
    borderColor: theme.colors.warningBorder,
  },
  statusProbationText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.warningDark,
  },
  actionBtn: {
    padding: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.xl,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  modalHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitleText: {
    fontSize: 16,
    fontWeight: '900',
    color: theme.colors.slate900,
  },
  modalBody: {
    marginTop: 14,
  },
  formGroup: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: theme.colors.slate500,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: theme.colors.slate50,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: theme.colors.slate900,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    marginBottom: 8,
  },
});
