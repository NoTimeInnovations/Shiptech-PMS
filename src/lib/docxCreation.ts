import { UserData } from "@/store/authStore";
import { Customer } from "@/store/customerStore";
import { Enquiry } from "@/store/enquiryStore";

import {
  Document,
  Paragraph,
  ImageRun,
  Packer,
  Table,
  TableCell,
  TableRow,
  WidthType,
  TextRun,
  PageBreak,
} from "docx";

function convertRichTextToDocx(htmlString: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");
  const elements = doc.body.childNodes;
  const paragraphs: Paragraph[] = [];

  elements.forEach((element) => {
    if (element.nodeName === "P") {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: element.textContent?.trim() ?? "" })],
          spacing: {
            after: 100,
          },
        })
      );
    } else if (element.nodeName === "UL" || element.nodeName === "OL") {
      element.childNodes.forEach((li) => {
        if (li.nodeName === "LI") {
          paragraphs.push(
            new Paragraph({
              text: `• ${li.textContent?.trim() ?? ""}`,
              spacing: {
                after: 100,
              },
            })
          );
        }
      });
    }
  });

  return paragraphs;
}

function breakLineBy(text: string, delimiter: string) {
  return text.split(delimiter).map((line) => line.trim());
}

function tableCell(text: string, bold: boolean = false) {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold })],
      }),
    ],
  });
}

function titleAndValue(title: string, value: string | string[]) {
  const isValueArray = Array.isArray(value);

  return new Paragraph({
    indent: {
      left: 600,
    },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: title,
            bold: true,
            underline: { color: "000000" },
          }),
        ],
        spacing: {
          after: 100,
        },
      }),
      ...(isValueArray
        ? value.map(
            (item) =>
              new Paragraph({
                children: [new TextRun({ text: "• " + item, bold: false })],
              })
          )
        : [
            new Paragraph({
              children: [new TextRun({ text: value, bold: false })],
            }),
          ]),
    ],
  });
}

export const createQuotation = async (enquiry: Enquiry , userData : UserData , customer : Customer) => {
  try {
    // Load image dynamically from public folder
    const imageUrl = "/images/doc/doc-header.png";
    const response = await fetch(imageUrl);
    const imageBuffer = await response.arrayBuffer(); // Convert image to ArrayBuffer
    const formatedDate = new Date(enquiry.createdAt).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );
    const address = breakLineBy(customer.address, ",");
    const totalDuration = enquiry.deliverables.reduce(
      (acc, deliverable) => acc + (deliverable.hours ?? 0),
      0
    );
    const totalAmount = enquiry.deliverables.reduce(
      (acc, deliverable) => acc + (deliverable.costPerHour ?? 0) * (deliverable.hours ?? 0),
      0
    );

    // Create document with header image
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 720, // 1 inch
                right: 720, // 1 inch
                bottom: 720, // 1 inch
                left: 720, // 1 inch
              },
            },
          },
          children: [
            // header image
            new Paragraph({
              children: [
                new ImageRun({
                  data: imageBuffer,
                  type: "png",
                  transformation: {
                    width: 700,
                    height: 150,
                  },
                }),
              ],
              spacing: {
                after: 120,
              },
            }),

            // address and data
            new Paragraph({
              children: [
                new Table({
                  columnWidths: [50, 50],
                  
                  borders: {
                    top: {
                      size: 0,
                      style: "none",
                    },
                    bottom: {
                      size: 0,
                      style: "none",
                    },
                    left: {
                      size: 0,
                      style: "none",
                    },
                    right: {
                      size: 0,
                      style: "none",
                    },
                  },
                  rows: [
                    new TableRow({
                      
                      children: [
                        new TableCell({
                          borders: {
                            top: {
                              size: 0,
                              style: "none",
                            },
                            bottom: {
                              size: 0,
                              style: "none",
                            },
                            left: {
                              size: 0,
                              style: "none",
                            },
                            right: {
                              size: 0,
                              style: "none",
                            },
                          },
                          width: { size: 50, type: WidthType.PERCENTAGE },
                          children: [
                            new Paragraph({
                              text: "ShipTech-ICON,",
                              alignment: "left",
                            }),
                            new Paragraph({
                              text: "CITTIC, CUSAT TBI",
                              alignment: "left",
                            }),
                            new Paragraph({
                              text: "CUSAT, Kochi-22",
                              alignment: "left",
                            }),
                          ],
                        }),
                        new TableCell({
                          borders: {
                            top: {
                              size: 0,
                              style: "none",
                            },
                            bottom: {
                              size: 0,
                              style: "none",
                            },
                            left: {
                              size: 0,
                              style: "none",
                            },
                            right: {
                              size: 0,
                              style: "none",
                            },
                          },
                          width: { size: 50, type: WidthType.PERCENTAGE },
                          children: [
                            new Paragraph({
                              text: `Ref: No: E513/QT/0124/01`,
                              alignment: "right",
                            }),
                            new Paragraph({
                              alignment: "right",
                              children: [
                                new TextRun({
                                  text: `Date: ${formatedDate}`,
                                  bold: true,
                                }),
                              ],
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                  width: { size: 100, type: WidthType.PERCENTAGE },
                }),
              ],
              spacing: {
                after: 120,
              },
            }),

            //   to info
            new Paragraph({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "To,",
                      bold: true,
                    }),
                  ],
                }),

                new Paragraph({
                  indent: {
                    left: 600,
                  },
                  children: [
                    ...address.map(
                      (line) =>
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: line,
                              bold: true,
                            }),
                          ],
                          spacing: {
                            after: 30,
                          },
                        })
                    ),

                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `Kind Attn: ${customer.name}`,
                        }),
                      ],
                      spacing: {
                        before: 400,
                        after: 400,
                      },
                    }),

                    new Paragraph({
                      children: [
                        new TextRun({
                          text: "Dear Sir,",
                        }),
                      ],
                      spacing: {
                        before: 400,
                        after: 400,
                      },
                    }),

                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `Sub : ${enquiry.name}`,
                          bold: true,
                          underline: {
                            color: "000000",
                          },
                        }),
                      ],
                      spacing: {
                        before: 400,
                      },
                    }),

                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `Ref : Enquiry through email dt 19/01/2024`,
                          bold: true,
                          underline: {
                            color: "000000",
                          },
                        }),
                      ],
                      spacing: {
                        after: 200,
                      },
                    }),
                  ],
                }),
              ],
            }),

            // first table
            new Paragraph({
              children: [
                new Table({
                  width: {
                    size: 100,
                    type: WidthType.PERCENTAGE,
                  },
                  columnWidths: [5, 50, 10, 10, 10, 15],
                  rows: [
                    new TableRow({
                      children: [
                        tableCell("No.", true),
                        tableCell("Description of Services", true),
                        tableCell("Rate", true),
                        tableCell("Qty", true),
                        tableCell("Amount(USD)", true),
                      ],
                    }),
                    new TableRow({
                      children: [
                        tableCell("1", false),
                        tableCell(`${enquiry.name}`, false),
                        tableCell("", false),
                        tableCell("", false),
                        tableCell(`$${totalAmount}/-`, false),
                      ],
                    }),
                    new TableRow({
                      children: [
                        tableCell("", false),
                        tableCell(
                          `Total:- $${totalAmount} USD only`,
                          true
                        ),
                        tableCell("", false),
                        tableCell("", false),
                        tableCell(`$${totalAmount}/-`, true),
                      ],
                    }),
                  ],
                }),
              ],
            }),

            // terms and conditions
            new Paragraph({
              children: [
                new TextRun({
                  text: "TERMS & CONDITIONS",
                  bold: true,
                  underline: {
                    color: "000000",
                  },
                }),
              ],
              spacing: {
                after: 150,
              },
            }),

            // inputs required
            new Paragraph({  
              children: [
                titleAndValue("Inputs Required", enquiry.inputsRequired),
                titleAndValue(
                  "Deliverables",
                  enquiry.deliverables.map((deliverable) => deliverable.name)
                ),
                // scoper of work
                new Paragraph({
                  indent: {
                    left: 600,
                  },
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: "Scope of Work",
                          bold: true,
                          underline: {
                            color: "000000",
                          },
                        }),
                      ],
                      spacing: {
                        after: 100,
                      },
                    }),
                    ...convertRichTextToDocx(enquiry.scopeOfWork),
                  ],
                }),
                titleAndValue("Exclusions", enquiry.exclusions),

                // delivery schedule
                new Paragraph({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: "Delivery Schedule",
                          bold: true,
                          underline: {
                            color: "000000",
                          },
                        }),
                      ],
                      spacing: {
                        after: 100,
                      },
                    }),

                    // table
                    new Paragraph({
                      children: [
                        new Table({
                          width: {
                            size: 100,
                            type: WidthType.PERCENTAGE,
                          },
                          rows: [
                            new TableRow({
                              children: [
                                tableCell("SI.NO", true),
                                tableCell("Scope of Work", true),
                                tableCell("Duration", true),
                              ],
                            }),
                            new TableRow({
                              children: [
                                tableCell("I", true),
                                tableCell(enquiry.name, false),
                                tableCell(`${totalDuration} hours`, false),
                              ],
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
                titleAndValue("Charges Included", enquiry.charges),
                titleAndValue(
                  "Tax",
                  "GST will be applicable extra as per existing rules (if any). "
                ),
                titleAndValue(
                  "Payment Mode",
                  "Direct transfer within Ten Working days from the date of invoice, in favor of SHIP TECHNOLOGY INDUSTRIAL CONSULTANCY as mentioned below"
                ),

                // bank details
                new Paragraph({
                  children: [
                    new Table({
                      width: {
                        size: 100,
                        type: WidthType.PERCENTAGE,
                      },
                      rows: [
                        new TableRow({
                          children: [
                            tableCell("A/c name: ", true),
                            tableCell(
                              "SHIP TECHNOLOGY INDUSTRIAL CONSULTANCY",
                              true
                            ),
                          ],
                        }),
                        new TableRow({
                          children: [
                            tableCell("Branch:  ", true),
                            tableCell("SBI CUSAT", true),
                          ],
                        }),
                        new TableRow({
                          children: [
                            tableCell("A/c no: ", true),
                            tableCell("36215018475", true),
                          ],
                        }),
                        new TableRow({
                          children: [
                            tableCell("IFSC: ", true),
                            tableCell("SBIN0070235", true),
                          ],
                        }),
                        new TableRow({
                          children: [
                            tableCell("SWIFT Code: ", true),
                            tableCell("SBININBBT30", true),
                          ],
                        }),
                        new TableRow({
                          children: [
                            tableCell("GST: ", true),
                            tableCell("32ADBFS1296G1Z8", true),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),

                titleAndValue(
                  "Modifications",
                  "Slight modifications if any can be incorporated without any additional charges.  However major modifications or design changes if any will be charged extra. "
                ),
                titleAndValue(
                  "Force Majeure",
                  "Will apply, especially with respect to the current pandemic situation."
                ),
                titleAndValue(
                  "Validity",
                  "This offer is valid for a period of 5 days from today."
                ),

                new PageBreak(),

                // tankyou 
                new Paragraph({
                    children: [
                        new Paragraph({
                            text : "Thanking you,"
                        }),
                        new Paragraph({
                            children : [
                                new TextRun({
                                    text : `${userData.fullName}`,
                                    bold : true,
                                })
                            ]
                        }),
                        new Paragraph({
                            children : [
                                new TextRun({
                                    text : `${userData.designation ?? 'User'}`,
                                    bold : true
                                })
                            ]
                        }),
                        new Paragraph({
                            children : [
                                new TextRun({
                                    text : "ShipTech-ICON",
                                    bold : true
                                })
                            ]
                        }),
                        new Paragraph({
                            children : [
                                new TextRun({
                                    text : "CITTIC, CUSAT TBI",
                                })
                            ]
                        }),
                        new Paragraph({
                            children : [
                                new TextRun({
                                    text : "CUSAT, Kochi-22",
                                })
                            ]
                        }),
                        new Paragraph({
                            children : [
                                new TextRun({
                                    text : "Email: stl@shiptech-icon.com",
                                })
                            ]
                        }),
                        new Paragraph({
                            children : [
                                new TextRun({
                                    text : "Web: http://www.shiptech-icon.com ",
                                })
                            ]
                        })
                    ]
                })
              ],
            }),
          ],
        },
      ],
    });

    // Generate DOCX file as a Blob (not nodebuffer)
    const blob = await Packer.toBlob(doc);

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "quotation.docx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error creating DOCX file:", error);
    throw error;
  }
};
