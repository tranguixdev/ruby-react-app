import React, { useState, useEffect } from "react";
import moment from "moment";
import dayjs from "dayjs";
import {
  Form,
  Layout,
  Select,
  DatePicker,
  Divider,
  Card,
  Row,
  Col,
  Table,
} from "antd";

import { API, currentDate } from "../utils/helper";
import { openNotificationWithIcon } from "../components/common/notification";

import {
  warehouseURL,
  shipperURL,
  inventoryURL,
  exportInventoryPdfDataUrl,
  exportStockCSVDataUrl,
} from "../utils/constants";

import CustomButton from "../components/common/CustomButton";
import $lang from "../utils/content/jp.json";

const { Content } = Layout;
const dateFormat = "YYYY/MM/DD";

const InventoryPage = ({ is_edit }) => {
  // ---------Warehouse--------
  const [selectedWarehouse, setSelectedWarehouse] = useState({
    value: "",
    label: $lang.all,
  });
  const [warehouseOptions, setWarehouseOptions] = useState([]);

  // ------------Shipper-----------
  const [seletedShipper, setSeletedShipper] = useState({
    value: "",
    label: $lang.all,
  });

  const [shipperOptions, setShipperOptions] = useState([]);
  const [shipperDisctription, setShipperDescription] = useState({
    code: "",
    closingDate: "",
  });

  const [inventories, setInventories] = useState([]);
  // ----------------Openday--------------
  const [targetDate, setTargetDate] = useState(dayjs(currentDate, dateFormat));

  const onChangeWarehouse = (value, option) => {
    setSelectedWarehouse({ value: value, label: option.label });
  };

  const onChangeShipper = (value, option) => {
    setSeletedShipper({ value: value, label: option.label });
  };

  const stockColumns = [
    {
      title: "No",
      dataIndex: "key",
      align: "center",
      width: "5%",
    },
    {
      title: `${$lang.productName}`,
      key: "product_name",
      width: "20%",
      dataIndex: "product_name",
      align: "center",
    },
    {
      title: `${$lang.packaging}`,
      dataIndex: "packaging",
      key: "packaging",
      align: "center",
    },
    {
      title: `${$lang.lotoNumber}`,
      dataIndex: "lot_number",
      key: "lot_number",
      align: "center",
    },
    {
      title: `${$lang.amount}`,
      dataIndex: "amount",
      key: "amount",
      align: "center",
    },
    {
      title: `${$lang.inStockDate}`,
      dataIndex: "inout_on",
      key: "amount",
      align: "center",
      render: (val) => (val != undefined ? val.replace(/\-/g, "/") : ""),
    },
  ];

  //  -------Get warehouse names--------
  const getWarehouses = () => {
    API.get(warehouseURL).then((res) => {
      const warehouses = res.data.map((item) => {
        return {
          value: item.id,
          label: item.name,
        };
      });

      warehouses.unshift({
        value: "",
        label: $lang.all,
      });

      setWarehouseOptions(warehouses);
    });
  };

  // --------Get shipper data--------
  const getShippers = () => {
    API.get(shipperURL).then((res) => {
      const shippers = res.data.map((item) => {
        return {
          value: item.id,
          label: item.name,
          code: item.code,
          closingDate: item.closingDate,
        };
      });

      shippers.unshift({
        value: "",
        label: $lang.all,
      });

      setShipperOptions(shippers);
    });
  };

  const getInventory = () => {
    const dateParam = new Date(targetDate.toString())
      .toISOString()
      .substring(0, 10);

    let url = `${inventoryURL}?out_date=${dateParam}`;

    if (seletedShipper.value != "")
      url +=
        seletedShipper.value != "" ? `&shipper_id=${seletedShipper.value}` : "";
    if (selectedWarehouse.value != "")
      url +=
        selectedWarehouse.value != ""
          ? `&warehouse_id=${selectedWarehouse.value}`
          : "";

    API.get(url)
      .then((res) => {
        const inventories = res.data.map((item, i) => {
          i++;
          return {
            inout_on: item.inout_on,
            amount: item.inventory_stock,
            lot_number: item.lot_number,
            product_name: item.name,
            packaging: item.packaging,
            weight: item.weight,
            key: i,
          };
        });
        setInventories(inventories);
      })
      .catch((err) => {});
  };

  const downloadPDF = (response) => {
    const blob = new Blob([response.data], { type: "application/pdf" });
    const fileName = "generated_pdf.pdf";

    // Construct the URL and initiate the download
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", fileName);
    a.click();
  };

  const exportDataAndDownloadPdf = () => {
    API.post(
      exportInventoryPdfDataUrl,
      {},
      {
        responseType: "arraybuffer",
      }
    )
      .then((res) => {
        downloadPDF(res);
      })
      .catch((err) => {
        console.error(err);
      });
  };

  const getCSVData = () => {
    return inventories.map((item) => {
      return {
        product_name: item.product_name,
        packaging: item.packaging,
        lot_number: item.lot_number,
        inout_on: item.inout_on.replace(/\-/g, "/"),
        amount: item.amount,
        warehouse_name: selectedWarehouse.label,
        weight: item.weight + "kg",
      };
    });
  };
  const exportDataAndDownloadCVS = async () => {
    openNotificationWithIcon(
      "warning",
      $lang.popConfirmType.warning,
      "現在作業しています。"
    );
    return;
    const csvData = getCSVData();
    if (csvData.length == 0) {
      openNotificationWithIcon(
        "warning",
        $lang.messages.warning,
        "empty data to export"
      );
      return;
    }

    const dateParam = new Date(targetDate.toString())
      .toISOString()
      .substring(0, 10);
    let url = `${exportStockCSVDataUrl}?out_date=${dateParam}`;

    if (seletedShipper.value != "")
      url +=
        seletedShipper.value != "" ? `&shipper_id=${seletedShipper.value}` : "";
    if (selectedWarehouse.value != "")
      url +=
        selectedWarehouse.value != ""
          ? `&warehouse_id=${selectedWarehouse.value}`
          : "";

    API.post(url, { data: csvData, shipper_id: seletedShipper.value })
      .then((response) => {
        const timestamp = Date.now();
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "在庫_" + timestamp + ".csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setTimeout(() => {
          openNotificationWithIcon(
            "success",
            $lang.popConfirmType.success,
            $lang.messages.success
          );
        }, 1000);
      })
      .catch((err) => {
        openNotificationWithIcon(
          "error",
          $lang.popConfirmType.error,
          err.messages
        );
      });
  };

  // ----------When rerender, get all data------
  useEffect(() => {
    getWarehouses();
    getShippers();
    getInventory();
  }, []);

  useEffect(() => {
    const shipper = shipperOptions.filter(
      (item) => item.value == seletedShipper.value
    );
    setShipperDescription({
      code: shipper.length > 0 ? shipper[0].code : "",
      closingDate: shipper.length > 0 ? shipper[0].closingDate : "",
    });
  }, [seletedShipper]);

  return (
    <div>
      <Content
        style={{ width: 1280, marginTop: 20 }}
        className="mx-auto flex flex-col justify-content content-h"
      >
        <Card
          style={{ width: "100%", marginTop: 20, marginBottom: 20 }}
          className="py-2 my-2"
          bordered={false}
        >
          <Form
            name="basic"
            autoComplete="off"
            initialValues={{
              warehouse: "",
              shipper: "",
              receipDate: "",
            }}
          >
            <Row className="my-2">
              <Col span={1}>
                <label>{$lang.inStock.warehouse}: </label>
              </Col>
              <Col span={6}>
                <Select
                  placeholder={$lang.inStock.warehouse}
                  style={{ width: 150, marginLeft: 14 }}
                  value={selectedWarehouse}
                  options={warehouseOptions}
                  onChange={onChangeWarehouse}
                />
              </Col>
            </Row>
            <Row className="my-2">
              <Col span={1}>
                <label>{$lang.inStock.shipper}:</label>
              </Col>
              <Col span={6}>
                <Select
                  style={{ width: 300, marginLeft: 14 }}
                  onChange={onChangeShipper}
                  options={shipperOptions}
                  value={seletedShipper.value}
                  defaultValue={""}
                  placeholder={$lang.inStock.shipper}
                />
                {shipperOptions.length > 0 && (
                  <span className="" style={{ marginLeft: 16 }}>
                    {$lang.inStock.shipper} :&nbsp;&nbsp;
                    {shipperDisctription.code} &nbsp;/ &nbsp;
                    {shipperDisctription.closingDate}
                  </span>
                )}{" "}
              </Col>
            </Row>
            <Row className="my-2">
              <Col span={1}>
                <label>{$lang.stock.targetDate}:</label>
              </Col>
              <Col span={10}>
                <div className="ml-2">
                  <DatePicker
                    style={{ width: 150 }}
                    value={targetDate}
                    onChange={(date, dateStr) => {
                      if (dateStr == "") {
                        setTargetDate(dayjs(currentDate, dateFormat));
                      } else setTargetDate(dayjs(dateStr, dateFormat));
                    }}
                    placeholder={$lang.inStock.in}
                    className="ml-1"
                    format={dateFormat}
                  />
                  <CustomButton
                    className="px-5 ml-2 btn-bg-black"
                    title={$lang.buttons.search}
                    visability={true}
                    onClick={getInventory}
                  />
                </div>
              </Col>
              <Col span={13}>
                {is_edit === 1 ? (
                  <>
                    <CustomButton
                      onClick={exportDataAndDownloadCVS}
                      className="px-5 ml-2 btn-bg-black"
                      title={$lang.stock.inventory_report}
                      visability={true}
                      style={{ float: "right" }}
                    />
                    {/* <CustomButton
                      onClick={exportDataAndDownloadPdf}
                      className="px-5 ml-2 btn-bg-black"
                      title={"export PDF"}
                      visability={true}
                      style={{ float: "right" }}
                    /> */}
                  </>
                ) : (
                  <></>
                )}
              </Col>
            </Row>
            <Divider />
          </Form>
        </Card>
        <Card
          style={{ width: "100%", marginTop: 20, marginBottom: 20 }}
          className="py-4 my-2"
          bordered={false}
        >
          <Table
            columns={stockColumns}
            dataSource={inventories}
            rowKey={(node) => node.key}
            is_edit={is_edit}
            pagination={true}
          />
        </Card>
      </Content>
    </div>
  );
};

export default InventoryPage;
