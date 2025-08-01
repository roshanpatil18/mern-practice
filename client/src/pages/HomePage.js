import React, { useState, useEffect } from "react";
import {
  Form,
  Input,
  message,
  Modal,
  Select,
  Table,
  DatePicker,
  Alert,
} from "antd";
import {
  UnorderedListOutlined,
  AreaChartOutlined,
  EditOutlined,
  DeleteOutlined,
  ExportOutlined,
} from "@ant-design/icons";
import Layout from "./../components/Layout/Layout";
import axios from "axios";
import moment from "moment";
import Analytics from "../components/Analytics";
import { BASE_URL } from "../utils/baseURL";
import { getResponseError } from "../utils/getResponseError";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const { RangePicker } = DatePicker;
const { Search } = Input;

const HomePage = () => {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allTransection, setAllTransection] = useState([]);
  const [frequency, setFrequency] = useState("7");
  const [selectedDate, setSelectedate] = useState([]);
  const [type, setType] = useState("all");
  const [viewData, setViewData] = useState("table");
  const [editable, setEditable] = useState(null);
  const [trasactionError, setTrasactionError] = useState(null);

  const columns = [
    { title: "S.No", dataIndex: "sno", key: "sno", render: (t, r, i) => i + 1 },
    {
      id: "1",
      title: "Date(yyyy-mm-dd)",
      dataIndex: "date",
      render: (text) => <span>{moment(text).format("YYYY-MM-DD")}</span>,
    },
    { id: "2", title: "Amount(Rs.)", dataIndex: "amount" },
    { id: "3", title: "Type", dataIndex: "type" },
    { id: "4", title: "Category", dataIndex: "category" },
    { id: "5", title: "Refrence", dataIndex: "refrence" },
    {
      id: "6",
      title: "Actions",
      render: (text, record) => (
        <div>
          <EditOutlined style={{ color: "green" }} onClick={() => { setEditable(record); setShowModal(true); }} />
          <DeleteOutlined style={{ color: "red" }} className="mx-2" onClick={() => handleDelete(record)} />
        </div>
      ),
    },
  ];

  const getAllTransactions = async () => {
    try {
      setTrasactionError(null);
      setLoading(true);
      const res = await axios.post(
        `${BASE_URL}/api/v1/transections/get-transection`,
        { frequency, selectedDate, type },
        { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem("user")).token}` } }
      );
      setAllTransection(res.data.transactions);
    } catch (error) {
      setTrasactionError(getResponseError(error));
      message.error("Fetch Issue With Transactions...!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { getAllTransactions(); }, [frequency, selectedDate, type]);

  const handleDelete = async (record) => {
    Modal.confirm({
      title: "Are you sure you want to delete this transaction?",
      okText: "Delete",
      okType: "danger",
      onOk: () => deleteTransaction(record),
    });
  };

  const deleteTransaction = async (record) => {
    try {
      setLoading(true);
      const transactionId = record.transactionId;
      await axios.post(
        `${BASE_URL}/api/v1/transections/delete-transection/${transactionId}`,
        {},
        { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem("user")).token}` } }
      );
      getAllTransactions();
      message.success("Transaction Deleted successfully...!");
    } catch (error) {
      setTrasactionError(getResponseError(error));
      message.error("Unable to delete");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      const endpoint = editable
        ? `${BASE_URL}/api/v1/transections/edit-transection/${editable.transactionId}`
        : `${BASE_URL}/api/v1/transections/add-transection`;

      await axios.post(
        endpoint,
        { ...values },
        { headers: { Authorization: `Bearer ${JSON.parse(localStorage.getItem("user")).token}` } }
      );

      getAllTransactions();
      message.success(`Transaction ${editable ? "Updated" : "Added"} Successfully`);
      setShowModal(false);
      setEditable(null);
    } catch (error) {
      setTrasactionError(getResponseError(error));
      message.error("Please fill all fields");
    } finally {
      setLoading(false);
    }
  };

  const onSearch = (value) => {
    if (!value) return getAllTransactions();
    const filteredData = allTransection.filter((transaction) =>
      Object.values(transaction).some((field) =>
        field?.toString().toLowerCase().includes(value.toLowerCase())
      )
    );
    setAllTransection(filteredData);
  };

  const exportToExcel = () => {
    if (allTransection.length === 0) return setTrasactionError("No data available to export.");
    const exportData = allTransection.map((transaction, index) => ({
      "S.No": index + 1,
      "Date (yyyy-mm-dd)": moment(transaction.date).format("YYYY-MM-DD"),
      "Amount (Rs.)": transaction.amount,
      Type: transaction.type,
      Category: transaction.category,
      Reference: transaction.refrence,
      Description: transaction.description,
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    const currentDate = moment().format("DD-MM-YYYY");
    saveAs(data, `Transactions(${currentDate}).xlsx`);
  };

  return (
    <Layout>
      <div className="transaction-page">
        {trasactionError && <Alert message={trasactionError} type="error" showIcon style={{ marginBottom: 10 }} />}

        <div className="filters">
          {/* Frequency */}
          <div>
            <h6>Select Frequency</h6>
            <Select value={frequency} onChange={(v) => setFrequency(v)}>
              <Select.Option value="7">LAST 1 Week</Select.Option>
              <Select.Option value="30">LAST 1 Month</Select.Option>
              <Select.Option value="365">LAST 1 Year</Select.Option>
              <Select.Option value="custom">Custom</Select.Option>
            </Select>
            {frequency === "custom" && <RangePicker value={selectedDate} onChange={(v) => setSelectedate(v)} />}
          </div>

          {/* Type */}
          <div className="filter-tab">
            <h6>Select Type</h6>
            <Select value={type} onChange={(v) => setType(v)}>
              <Select.Option value="all">ALL</Select.Option>
              <Select.Option value="Income">INCOME</Select.Option>
              <Select.Option value="Expense">EXPENSE</Select.Option>
            </Select>
          </div>

          {/* View toggle */}
          <div className="switch-icons">
            <UnorderedListOutlined className={`mx-2 ${viewData === "table" ? "active-icon" : "inactive-icon"}`} onClick={() => setViewData("table")} />
            <AreaChartOutlined className={`mx-2 ${viewData === "analytics" ? "active-icon" : "inactive-icon"}`} onClick={() => setViewData("analytics")} />
          </div>

          {/* Search */}
          <div className="search-bar">
            <Search placeholder="search text" allowClear onSearch={onSearch} style={{ width: 180 }} />
          </div>

          {/* Buttons */}
          <div>
            <button className="btn btn-primary" onClick={() => { setEditable(null); setShowModal(true); }}>Add New</button>
          </div>
          <div>
            <button className="btn btn-secondary trasctn-exprt-btn" onClick={exportToExcel}>Export to Excel <ExportOutlined /></button>
          </div>
          <div>
            <button className="btn btn-success" onClick={() => window.location.href = "/chatbot"}>Chat with AI 🤖</button>
          </div>
        </div>

        <div className="content">
          {viewData === "table" ? <Table columns={columns} dataSource={allTransection} /> : <Analytics allTransection={allTransection} />}
        </div>

        <Modal
          title={editable ? "Edit Transaction" : "Add Transection"}
          open={showModal}
          onCancel={() => setShowModal(false)}
          destroyOnClose
          footer={false}
        >
          <Form layout="vertical" onFinish={handleSubmit} initialValues={editable}>
            <Form.Item label="Amount" name="amount"><Input type="text" required /></Form.Item>
            <Form.Item label="Type" name="type">
              <Select>
                <Select.Option value="Income">Income</Select.Option>
                <Select.Option value="Expense">Expense</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item label="Category" name="category">
              <Select>
                <Select.Option value="Income in Salary">Income in Salary</Select.Option>
                <Select.Option value="Income in Part Time">Income in Part Time</Select.Option>
                <Select.Option value="Income in Project">Income in Project</Select.Option>
                <Select.Option value="Income in Freelancing">Income in Freelancing</Select.Option>
                <Select.Option value="Expense in Tip">Expense in Tip</Select.Option>
                <Select.Option value="Expense in Stationary">Expense in Stationary</Select.Option>
                <Select.Option value="Expense in Food">Expense in Food</Select.Option>
                <Select.Option value="Expense in Movie">Expense in Movie</Select.Option>
                <Select.Option value="Expense in Bills">Expense in Bills</Select.Option>
                <Select.Option value="Expense in Medical">Expense in Medical</Select.Option>
                <Select.Option value="Expense in Fees">Expense in Fees</Select.Option>
                <Select.Option value="Expense in TAX">Expense in TAX</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item label="Date" name="date"><Input type="date" /></Form.Item>
            <Form.Item label="Refrence" name="refrence"><Input type="text" required /></Form.Item>
            <Form.Item label="Description" name="description"><Input type="text" required /></Form.Item>
            <div className="d-flex justify-content-end">
              <button type="submit" className="btn btn-primary" disabled={loading}> SAVE</button>
            </div>
          </Form>
        </Modal>
      </div>
    </Layout>
  );
};

export default HomePage;
