import React, { useState, useEffect } from "react";
import { PageHeader, Card, Input, Button, Badge } from "@study-karnataka/ui";
import { useTeam } from "../../hooks/useTeam";
import { useRoles } from "../../hooks/useRoles";
import { useNavigate } from "react-router-dom";
import { Shield, ChevronDown, Check, X, Info } from "lucide-react";

export const InviteTeamMemberPage: React.FC = () => {
  const navigate = useNavigate();
  const { inviteMember } = useTeam();
  const { roles, fetchRoles } = useRoles();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "+91",
    employeeId: "",
    department: "",
    designation: "",
    roleId: "",
    status: "PENDING_INVITE",
    reportingManagerId: "",
    memberModuleScope: [] as string[],
    examScope: [] as string[],
    mentorshipMode: "1-to-1 Mentorship",
    maxCapacity: "50",
    sendEmailInvite: true,
    welcomeMessage: "",
    joinDate: new Date().toISOString().split("T")[0],
    invitationExpiry: "7 days",
  });

  const [selectedRole, setSelectedRole] = useState<any>(null);

  useEffect(() => {
    fetchRoles({ status: "Active" });
  }, [fetchRoles]);

  useEffect(() => {
    if (formData.roleId) {
      const role = roles.find((r) => r.id === formData.roleId);
      if (role) {
        setSelectedRole(role);
        setFormData((prev) => ({
          ...prev,
          memberModuleScope: role.modules || [],
        }));
      }
    } else {
      setSelectedRole(null);
      setFormData((prev) => ({ ...prev, memberModuleScope: [] }));
    }
  }, [formData.roleId, roles]);

  const toggleModule = (mod: string) => {
    setFormData((prev) => ({
      ...prev,
      memberModuleScope: prev.memberModuleScope.includes(mod)
        ? prev.memberModuleScope.filter((m) => m !== mod)
        : [...prev.memberModuleScope, mod],
    }));
  };

  const handleSubmit = async () => {
    if (!formData.fullName || !formData.email || !formData.roleId) {
      alert("Please fill out Name, Email, and Role.");
      return;
    }
    const success = await inviteMember({
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      employeeId: formData.employeeId,
      department: formData.department,
      designation: formData.designation,
      roleId: formData.roleId,
      adminModuleAccess: formData.memberModuleScope,
      examScope: formData.examScope,
      reportingManagerId: formData.reportingManagerId,
      mentorSettings:
        selectedRole?.code === "MENTOR"
          ? {
              mentorshipMode: formData.mentorshipMode,
              maxCapacity: formData.maxCapacity,
            }
          : undefined,
    });

    if (success) {
      navigate("/team/members");
    }
  };

  return (
    <div style={{ paddingBottom: "100px", width: "100%" }}>
      <PageHeader
        title="Invite Team Member"
        subtitle="Add a new team member and assign role, scope and additional settings."
        breadcrumbItems={[
          { label: "Admin", href: "/" },
          { label: "Team", href: "/team" },
          { label: "Team Members", href: "/team/members" },
          { label: "Invite Team Member" },
        ]}
        backButton={{ onClick: () => navigate("/team/members"), label: "Back" }}
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "70% 30%",
          gap: "24px",
          marginTop: "24px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <Card style={{ padding: "24px" }}>
            <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: "#EFF6FF",
                  color: "#2563EB",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                }}
              >
                1
              </div>
              <div>
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "#1E293B",
                    margin: "0 0 4px 0",
                  }}
                >
                  Basic Information
                </h3>
                <p style={{ margin: 0, fontSize: "13px", color: "#64748B" }}>
                  Enter the team member's basic details.
                </p>
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "24px",
              }}
            >
              <div>
                <label
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#475569",
                    marginBottom: "8px",
                    display: "block",
                  }}
                >
                  Full Name <span style={{ color: "#EF4444" }}>*</span>
                </label>
                <Input
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData({ ...formData, fullName: e.target.value })
                  }
                  placeholder="Meera Joshi"
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#475569",
                    marginBottom: "8px",
                    display: "block",
                  }}
                >
                  Work Email <span style={{ color: "#EF4444" }}>*</span>
                </label>
                <Input
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="meera@studykarnataka.in"
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#475569",
                    marginBottom: "8px",
                    display: "block",
                  }}
                >
                  Phone Number
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <select
                    style={{
                      width: "80px",
                      padding: "8px",
                      borderRadius: "6px",
                      border: "1px solid #E2E8F0",
                      backgroundColor: "#F8FAFC",
                    }}
                  >
                    <option>+91</option>
                  </select>
                  <Input
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="9876543210"
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
              <div>
                <label
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#475569",
                    marginBottom: "8px",
                    display: "block",
                  }}
                >
                  Employee ID
                </label>
                <Input
                  value={formData.employeeId}
                  onChange={(e) =>
                    setFormData({ ...formData, employeeId: e.target.value })
                  }
                  placeholder="EMP-1028"
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#475569",
                    marginBottom: "8px",
                    display: "block",
                  }}
                >
                  Department
                </label>
                <select
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "6px",
                    border: "1px solid #E2E8F0",
                    fontSize: "14px",
                  }}
                >
                  <option>Academic Operations</option>
                  <option>Support</option>
                  <option>Engineering</option>
                </select>
              </div>
              <div>
                <label
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#475569",
                    marginBottom: "8px",
                    display: "block",
                  }}
                >
                  Designation
                </label>
                <Input
                  value={formData.designation}
                  onChange={(e) =>
                    setFormData({ ...formData, designation: e.target.value })
                  }
                  placeholder="Mentor"
                />
              </div>
            </div>
          </Card>

          <Card style={{ padding: "24px" }}>
            <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: "#EFF6FF",
                  color: "#2563EB",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                }}
              >
                2
              </div>
              <div>
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "#1E293B",
                    margin: "0 0 4px 0",
                  }}
                >
                  Role & Scope
                </h3>
                <p style={{ margin: 0, fontSize: "13px", color: "#64748B" }}>
                  Assign a role and define the working scope for this team
                  member.
                </p>
              </div>
            </div>
            <div style={{ display: "grid", gap: "24px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "16px",
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "#475569",
                      marginBottom: "8px",
                      display: "block",
                    }}
                  >
                    Role <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <select
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "6px",
                      border: "1px solid #E2E8F0",
                      fontSize: "14px",
                      backgroundColor: "#FFFFFF",
                    }}
                    value={formData.roleId}
                    onChange={(e) =>
                      setFormData({ ...formData, roleId: e.target.value })
                    }
                  >
                    <option value="">Select a Role...</option>
                    {roles.length > 0 ? (
                      roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))
                    ) : (
                      <option disabled>No active roles are available.</option>
                    )}
                  </select>
                </div>
                <div>
                  <label
                    style={{
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "#475569",
                      marginBottom: "8px",
                      display: "block",
                    }}
                  >
                    Status <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      padding: "8px 12px",
                      border: "1px solid #E2E8F0",
                      borderRadius: "6px",
                      backgroundColor: "#FFFFFF",
                    }}
                  >
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: "#10B981",
                        marginRight: "8px",
                      }}
                    ></div>
                    <select
                      style={{
                        width: "100%",
                        border: "none",
                        outline: "none",
                        backgroundColor: "transparent",
                        fontSize: "14px",
                      }}
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value })
                      }
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="PENDING_INVITE">Pending Invite</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label
                    style={{
                      fontSize: "13px",
                      fontWeight: 500,
                      color: "#475569",
                      marginBottom: "8px",
                      display: "block",
                    }}
                  >
                    Reporting Manager
                  </label>
                  <Input
                    value={formData.reportingManagerId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        reportingManagerId: e.target.value,
                      })
                    }
                    placeholder="Search manager"
                  />
                </div>
              </div>

              {roles.length === 0 && (
                <div
                  style={{
                    padding: "16px",
                    backgroundColor: "#FEF2F2",
                    borderRadius: "8px",
                    border: "1px solid #FCA5A5",
                    color: "#B91C1C",
                  }}
                >
                  <p style={{ margin: 0, fontWeight: 500 }}>
                    No active roles are available.
                  </p>
                  <p style={{ margin: "4px 0 12px 0", fontSize: "13px" }}>
                    Create or activate a role under Roles & Permissions before
                    inviting a team member.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => navigate("/team/roles-permissions")}
                  >
                    Go to Roles & Permissions
                  </Button>
                </div>
              )}

              {selectedRole && (
                <>
                  <div>
                    <label
                      style={{
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "#475569",
                        marginBottom: "8px",
                        display: "block",
                      }}
                    >
                      Module Scope <span style={{ color: "#EF4444" }}>*</span>
                    </label>
                    <p
                      style={{
                        margin: "0 0 12px 0",
                        fontSize: "12px",
                        color: "#64748B",
                      }}
                    >
                      Select the modules this member can work in (limited to
                      modules allowed by {selectedRole.name} role).
                    </p>
                    <div
                      style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}
                    >
                      {selectedRole.modules.map((mod: string) => {
                        const isChecked =
                          formData.memberModuleScope.includes(mod);
                        return (
                          <label
                            key={mod}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              padding: "8px 16px",
                              backgroundColor: isChecked
                                ? "#EFF6FF"
                                : "#FFFFFF",
                              border: `1px solid ${isChecked ? "#2563EB" : "#E2E8F0"}`,
                              borderRadius: "6px",
                              cursor: "pointer",
                              transition: "all 0.2s",
                            }}
                          >
                            <input
                              type="checkbox"
                              className="rounded border-slate-300"
                              style={{ accentColor: "#2563EB" }}
                              checked={isChecked}
                              onChange={() => toggleModule(mod)}
                            />
                            <span
                              style={{
                                fontSize: "13px",
                                fontWeight: 500,
                                color: isChecked ? "#1D4ED8" : "#475569",
                              }}
                            >
                              {mod.replace("_", " ")}
                            </span>
                          </label>
                        );
                      })}
                      {selectedRole.modules.length === 0 && (
                        <span style={{ fontSize: "13px", color: "#64748B" }}>
                          No modules allowed by this role.
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label
                      style={{
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "#475569",
                        marginBottom: "8px",
                        display: "block",
                      }}
                    >
                      Exam Scope <span style={{ color: "#EF4444" }}>*</span>
                    </label>
                    <p
                      style={{
                        margin: "0 0 12px 0",
                        fontSize: "12px",
                        color: "#64748B",
                      }}
                    >
                      Select the exams this member can work on.
                    </p>
                    <div
                      style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}
                    >
                      {["UPSC", "KPSC", "KAS", "Others"].map((exam) => {
                        const isChecked = formData.examScope.includes(exam);
                        return (
                          <label
                            key={exam}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              padding: "8px 16px",
                              backgroundColor: isChecked
                                ? "#EFF6FF"
                                : "#FFFFFF",
                              border: `1px solid ${isChecked ? "#2563EB" : "#E2E8F0"}`,
                              borderRadius: "6px",
                              cursor: "pointer",
                              transition: "all 0.2s",
                            }}
                          >
                            <input
                              type="checkbox"
                              className="rounded border-slate-300"
                              style={{ accentColor: "#2563EB" }}
                              checked={isChecked}
                              onChange={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  examScope: isChecked
                                    ? prev.examScope.filter((e) => e !== exam)
                                    : [...prev.examScope, exam],
                                }))
                              }
                            />
                            <span
                              style={{
                                fontSize: "13px",
                                fontWeight: 500,
                                color: isChecked ? "#1D4ED8" : "#475569",
                              }}
                            >
                              {exam}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {selectedRole?.code === "MENTOR" && (
                <div
                  style={{
                    padding: "24px",
                    backgroundColor: "#F8FAFC",
                    borderRadius: "12px",
                    border: "1px solid #E2E8F0",
                    display: "flex",
                    gap: "24px",
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      backgroundColor: "#DBEAFE",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#1D4ED8",
                      flexShrink: 0,
                    }}
                  >
                    <Shield size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4
                      style={{
                        margin: "0 0 4px 0",
                        fontSize: "15px",
                        fontWeight: 600,
                        color: "#1E293B",
                      }}
                    >
                      Mentor Settings
                    </h4>
                    <p
                      style={{
                        margin: "0 0 16px 0",
                        fontSize: "13px",
                        color: "#64748B",
                      }}
                    >
                      Additional settings for mentor.
                    </p>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "16px",
                      }}
                    >
                      <div>
                        <label
                          style={{
                            fontSize: "13px",
                            fontWeight: 500,
                            color: "#475569",
                            marginBottom: "8px",
                            display: "block",
                          }}
                        >
                          Mentorship Mode{" "}
                          <span style={{ color: "#EF4444" }}>*</span>
                        </label>
                        <select
                          style={{
                            width: "100%",
                            padding: "9px 12px",
                            borderRadius: "6px",
                            border: "1px solid #E2E8F0",
                            fontSize: "14px",
                            backgroundColor: "#FFFFFF",
                          }}
                          value={formData.mentorshipMode}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              mentorshipMode: e.target.value,
                            })
                          }
                        >
                          <option>1-to-1 Mentorship</option>
                          <option>Group Mentorship</option>
                          <option>Both</option>
                        </select>
                      </div>
                      <div>
                        <label
                          style={{
                            fontSize: "13px",
                            fontWeight: 500,
                            color: "#475569",
                            marginBottom: "8px",
                            display: "block",
                          }}
                        >
                          Maximum Student Capacity{" "}
                          <span style={{ color: "#EF4444" }}>*</span>
                        </label>
                        <Input
                          type="number"
                          value={formData.maxCapacity}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              maxCapacity: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "16px",
                      backgroundColor: "#EFF6FF",
                      borderRadius: "8px",
                      border: "1px solid #BFDBFE",
                      color: "#1D4ED8",
                      fontSize: "13px",
                      fontWeight: 500,
                      width: "250px",
                      display: "flex",
                      gap: "12px",
                      alignItems: "flex-start",
                    }}
                  >
                    <Info
                      size={18}
                      style={{ flexShrink: 0, marginTop: "2px" }}
                    />
                    <span style={{ lineHeight: "1.5" }}>
                      Students can be assigned later from Team → Work
                      Assignments.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card style={{ padding: "24px" }}>
            <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: "#EFF6FF",
                  color: "#2563EB",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                }}
              >
                3
              </div>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <h3
                    style={{
                      fontSize: "18px",
                      fontWeight: 600,
                      color: "#1E293B",
                      margin: "0 0 4px 0",
                    }}
                  >
                    Inherited Role Access
                  </h3>
                  <p style={{ margin: 0, fontSize: "13px", color: "#64748B" }}>
                    This member will inherit the following permissions from the
                    selected role.
                  </p>
                </div>
                {selectedRole && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/team/roles-permissions")}
                  >
                    View Role Details
                  </Button>
                )}
              </div>
            </div>
            {selectedRole ? (
              <div
                style={{
                  border: "1px solid #E2E8F0",
                  borderRadius: "12px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    padding: "20px",
                    backgroundColor: "#F8FAFC",
                    borderBottom: "1px solid #E2E8F0",
                  }}
                >
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      backgroundColor: "#FCE7F3",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#BE185D",
                    }}
                  >
                    <Users size={24} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "4px",
                      }}
                    >
                      <h4
                        style={{
                          margin: 0,
                          fontSize: "16px",
                          fontWeight: 600,
                          color: "#1E293B",
                        }}
                      >
                        {selectedRole.name}
                      </h4>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          color: "#2563EB",
                          backgroundColor: "#DBEAFE",
                          padding: "2px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        System Role
                      </span>
                    </div>
                    <p
                      style={{ margin: 0, fontSize: "13px", color: "#64748B" }}
                    >
                      Guide assigned students and monitor their preparation
                      progress.
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#475569",
                        marginBottom: "8px",
                      }}
                    >
                      Allowed Modules ({selectedRole.modules.length})
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "6px",
                        flexWrap: "wrap",
                        justifyContent: "flex-end",
                        maxWidth: "200px",
                      }}
                    >
                      {selectedRole.modules.map((m: string) => (
                        <span
                          key={m}
                          style={{
                            backgroundColor: "#FFFFFF",
                            color: "#2563EB",
                            border: "1px solid #BFDBFE",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: 500,
                          }}
                        >
                          {m.replace("_", " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    padding: "16px 20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <Shield size={20} color="#64748B" />
                    <div>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: 500,
                          color: "#1E293B",
                        }}
                      >
                        View Inherited Permissions{" "}
                        <span style={{ color: "#94A3B8", fontWeight: 400 }}>
                          (Read Only)
                        </span>
                      </div>
                      <div style={{ fontSize: "13px", color: "#64748B" }}>
                        Permissions are managed under Team → Roles &
                        Permissions.
                      </div>
                    </div>
                  </div>
                  <ChevronDown size={20} color="#94A3B8" />
                </div>
              </div>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "32px",
                  color: "#64748B",
                }}
              >
                Select a role above to view inherited permissions.
              </div>
            )}
          </Card>

          <Card style={{ padding: "24px" }}>
            <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: "#EFF6FF",
                  color: "#2563EB",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                }}
              >
                4
              </div>
              <div>
                <h3
                  style={{
                    fontSize: "18px",
                    fontWeight: 600,
                    color: "#1E293B",
                    margin: "0 0 4px 0",
                  }}
                >
                  Invite Settings
                </h3>
                <p style={{ margin: 0, fontSize: "13px", color: "#64748B" }}>
                  Configure invitation options.
                </p>
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "250px 1fr 150px 150px",
                gap: "24px",
                alignItems: "flex-start",
              }}
            >
              <div>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: "40px",
                      height: "24px",
                      backgroundColor: formData.sendEmailInvite
                        ? "#2563EB"
                        : "#CBD5E1",
                      borderRadius: "12px",
                      position: "relative",
                      transition: "all 0.2s",
                    }}
                  >
                    <div
                      style={{
                        width: "20px",
                        height: "20px",
                        backgroundColor: "#FFFFFF",
                        borderRadius: "50%",
                        position: "absolute",
                        top: "2px",
                        left: formData.sendEmailInvite ? "18px" : "2px",
                        transition: "all 0.2s",
                      }}
                    />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#1E293B",
                      }}
                    >
                      Send Email Invitation
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748B" }}>
                      An invitation link will be sent to the team member's
                      email.
                    </div>
                  </div>
                </label>
              </div>
              <div>
                <label
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#475569",
                    marginBottom: "8px",
                    display: "block",
                  }}
                >
                  Welcome Message (Optional)
                </label>
                <textarea
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "6px",
                    border: "1px solid #E2E8F0",
                    height: "80px",
                    fontSize: "14px",
                    resize: "none",
                  }}
                  placeholder="Hi Meera,\nYou have been invited to join Study Karnataka as a Mentor. Please set up your account using the secure link in this email."
                  value={formData.welcomeMessage}
                  onChange={(e) =>
                    setFormData({ ...formData, welcomeMessage: e.target.value })
                  }
                />
                <div
                  style={{
                    textAlign: "right",
                    fontSize: "11px",
                    color: "#94A3B8",
                    marginTop: "4px",
                  }}
                >
                  112/500
                </div>
              </div>
              <div>
                <label
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#475569",
                    marginBottom: "8px",
                    display: "block",
                  }}
                >
                  Join Date
                </label>
                <Input
                  type="date"
                  value={formData.joinDate}
                  onChange={(e) =>
                    setFormData({ ...formData, joinDate: e.target.value })
                  }
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "#475569",
                    marginBottom: "8px",
                    display: "block",
                  }}
                >
                  Invitation Expiry
                </label>
                <select
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "6px",
                    border: "1px solid #E2E8F0",
                    fontSize: "14px",
                  }}
                  value={formData.invitationExpiry}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      invitationExpiry: e.target.value,
                    })
                  }
                >
                  <option>7 days</option>
                  <option>14 days</option>
                  <option>30 days</option>
                </select>
              </div>
            </div>
          </Card>
        </div>

        <div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "24px" }}
          >
            <div>
              <h3
                style={{
                  margin: "0 0 4px 0",
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "#1E293B",
                }}
              >
                Invite Preview
              </h3>
              <p
                style={{
                  margin: "0 0 16px 0",
                  fontSize: "13px",
                  color: "#64748B",
                }}
              >
                Review the team member details and settings.
              </p>

              <Card style={{ padding: "0", overflow: "hidden" }}>
                <div
                  style={{
                    padding: "24px",
                    display: "flex",
                    gap: "16px",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: "50%",
                      backgroundColor: "#FCE7F3",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "24px",
                      fontWeight: 700,
                      color: "#BE185D",
                      flexShrink: 0,
                    }}
                  >
                    {formData.fullName
                      ? formData.fullName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .substring(0, 2)
                          .toUpperCase()
                      : "MJ"}
                  </div>
                  <div>
                    <h3
                      style={{
                        margin: "0 0 4px 0",
                        fontSize: "16px",
                        fontWeight: 600,
                        color: "#1E293B",
                      }}
                    >
                      {formData.fullName || "Meera Joshi"}
                    </h3>
                    <div
                      style={{
                        fontSize: "13px",
                        color: "#64748B",
                        marginBottom: "4px",
                      }}
                    >
                      {formData.email || "meera@studykarnataka.in"}
                    </div>
                    <div
                      style={{
                        fontSize: "13px",
                        color: "#64748B",
                        marginBottom: "12px",
                      }}
                    >
                      {formData.phone || "+91 9876543210"}
                    </div>
                    <div style={{ fontSize: "13px", color: "#475569" }}>
                      {formData.employeeId || "EMP-1028"} •{" "}
                      {formData.designation || "Mentor"}
                      <br />
                      {formData.department || "Academic Operations"} •{" "}
                      {selectedRole?.name || "Mentor"}
                    </div>
                  </div>
                  <div
                    style={{ position: "absolute", top: "24px", right: "24px" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "4px 12px",
                        backgroundColor: "#F8FAFC",
                        borderRadius: "12px",
                        border: "1px solid #E2E8F0",
                      }}
                    >
                      <div
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          backgroundColor: "#10B981",
                        }}
                      ></div>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 500,
                          color: "#10B981",
                        }}
                      >
                        Active
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    padding: "20px",
                    borderTop: "1px solid #E2E8F0",
                    backgroundColor: "#F8FAFC",
                  }}
                >
                  <h4
                    style={{
                      margin: "0 0 16px 0",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#1E293B",
                    }}
                  >
                    Role & Scope
                  </h4>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "120px 1fr",
                      gap: "12px",
                      fontSize: "13px",
                    }}
                  >
                    <div style={{ color: "#64748B" }}>Role</div>
                    <div style={{ fontWeight: 600, color: "#1E293B" }}>
                      {selectedRole?.name || "Mentor"}
                    </div>

                    <div style={{ color: "#64748B" }}>Module Scope</div>
                    <div
                      style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}
                    >
                      {(formData.memberModuleScope.length > 0
                        ? formData.memberModuleScope
                        : ["Students", "Study Plans", "MCQ Library & Tests"]
                      ).map((m) => (
                        <span
                          key={m}
                          style={{
                            backgroundColor: "#EFF6FF",
                            color: "#2563EB",
                            border: "1px solid #BFDBFE",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: 500,
                          }}
                        >
                          {m.replace("_", " ")}
                        </span>
                      ))}
                    </div>

                    <div style={{ color: "#64748B" }}>Exam Scope</div>
                    <div
                      style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}
                    >
                      {(formData.examScope.length > 0
                        ? formData.examScope
                        : ["UPSC", "KPSC"]
                      ).map((e) => (
                        <span
                          key={e}
                          style={{
                            backgroundColor: "#EFF6FF",
                            color: "#2563EB",
                            border: "1px solid #BFDBFE",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: 500,
                          }}
                        >
                          {e}
                        </span>
                      ))}
                    </div>

                    <div style={{ color: "#64748B" }}>Reporting Manager</div>
                    <div style={{ color: "#1E293B" }}>
                      {formData.reportingManagerId || "Ravi Shankar (Admin)"}
                    </div>
                  </div>
                </div>

                {selectedRole?.code === "MENTOR" && (
                  <div
                    style={{
                      padding: "20px",
                      borderTop: "1px solid #E2E8F0",
                      backgroundColor: "#FFFFFF",
                    }}
                  >
                    <h4
                      style={{
                        margin: "0 0 16px 0",
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#1E293B",
                      }}
                    >
                      Mentor Settings
                    </h4>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "120px 1fr",
                        gap: "12px",
                        fontSize: "13px",
                      }}
                    >
                      <div style={{ color: "#64748B" }}>Mentorship Mode</div>
                      <div style={{ color: "#1E293B" }}>
                        {formData.mentorshipMode}
                      </div>
                      <div style={{ color: "#64748B" }}>Maximum Capacity</div>
                      <div style={{ color: "#1E293B" }}>
                        {formData.maxCapacity} students
                      </div>
                    </div>
                  </div>
                )}

                <div
                  style={{
                    padding: "20px",
                    borderTop: "1px solid #E2E8F0",
                    backgroundColor: "#F8FAFC",
                  }}
                >
                  <h4
                    style={{
                      margin: "0 0 16px 0",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#1E293B",
                    }}
                  >
                    Invite Settings
                  </h4>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "120px 1fr",
                      gap: "12px",
                      fontSize: "13px",
                    }}
                  >
                    <div style={{ color: "#64748B" }}>
                      Send Email Invitation
                    </div>
                    <div style={{ color: "#1E293B" }}>
                      {formData.sendEmailInvite ? "Yes" : "No"}
                    </div>
                    <div style={{ color: "#64748B" }}>Join Date</div>
                    <div style={{ color: "#1E293B" }}>
                      {new Date(formData.joinDate).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                    <div style={{ color: "#64748B" }}>Invitation Expiry</div>
                    <div style={{ color: "#1E293B" }}>
                      {formData.invitationExpiry}
                    </div>
                  </div>
                </div>
              </Card>

              <Card
                style={{ padding: "0", overflow: "hidden", marginTop: "24px" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "16px 20px",
                    backgroundColor: "#ECFDF5",
                    borderBottom: "1px solid #D1FAE5",
                  }}
                >
                  <Shield size={20} color="#10B981" />
                  <h4
                    style={{
                      margin: 0,
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#065F46",
                    }}
                  >
                    Inherited Role Permissions
                  </h4>
                </div>
                <div
                  style={{
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  {[
                    "View assigned students",
                    "View student progress",
                    "View study plans",
                    "View test/MCQ performance",
                    "Add mentor notes",
                    "Manage mentor check-ins",
                    "View mentorship reports",
                  ].map((p) => (
                    <div
                      key={p}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        fontSize: "13px",
                        color: "#1E293B",
                      }}
                    >
                      <Check size={16} color="#10B981" /> {p}
                    </div>
                  ))}
                  <div
                    style={{
                      height: "1px",
                      backgroundColor: "#E2E8F0",
                      margin: "8px 0",
                    }}
                  />
                  {[
                    "No billing administration",
                    "No team management",
                    "No platform settings",
                    "No security management",
                  ].map((p) => (
                    <div
                      key={p}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        fontSize: "13px",
                        color: "#64748B",
                      }}
                    >
                      <X size={16} color="#EF4444" /> {p}
                    </div>
                  ))}
                </div>
              </Card>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "16px",
                  marginTop: "32px",
                }}
              >
                <Button
                  variant="outline"
                  onClick={() => navigate("/team/members")}
                  style={{ padding: "12px 32px" }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  style={{
                    padding: "12px 32px",
                    backgroundColor: "#2563EB",
                    color: "white",
                    display: "flex",
                    gap: "8px",
                    alignItems: "center",
                  }}
                >
                  Send Invitation
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
